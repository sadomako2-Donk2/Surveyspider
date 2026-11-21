import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  DRAFT_LENGTHS,
  analystIntro,
  checkPrompt,
  cleanTurns,
  dataSummary,
  draftPrompt,
  normaliseCheck,
  normaliseDraft,
  normaliseRead,
  normaliseReport,
  readPrompt,
  reportPrompt,
} from "@/lib/ai";
import { SEGMENTS, isCategoryQ, safeGroups, segValue, type ARow } from "@/lib/analysis";
import { normaliseQuestion } from "@/lib/surveys";
import { requireVerified } from "../auth/guards";
import { handle } from "../auth/handlers";
import { BadRequest, fail, json, readJson } from "../http";
import { tooMany } from "../rate-limit";
import { loadAnalysis } from "../surveys/analysis";
import { AiError, aiEnabled, aiLimitPerHour, askClaude, askClaudeJson } from "./claude";

type Db = PrismaClient;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Every AI route: signed in with a confirmed email, AI switched on, and within the hourly limit.
 * The limit is per account and kept in the database, so it holds across server restarts.
 */
const aiRoute = (fn: (req: Request, db: Db, userId: string) => Promise<Response>) =>
  handle(async (req, db) => {
    const { user, error } = await requireVerified(db, req, "use the AI features");
    if (error) return error;
    if (!aiEnabled()) return fail(503, "ai_disabled", "AI is not set up on this server yet.");
    if (await tooMany(db, `ai|${user.id}`, aiLimitPerHour(), 60 * 60 * 1000))
      return fail(429, "rate_limited", "You've used the AI features a lot in the last hour. Try again later.");
    try {
      return await fn(req, db, user.id);
    } catch (e) {
      if (e instanceof AiError) return fail(e.status, e.code, e.message);
      throw e;
    }
  });

export const draftSurvey = aiRoute(async (req) => {
  const b = await readJson(req, 5_000);
  const goal = text(b.goal, 800),
    audience = text(b.audience, 160);
  const n = DRAFT_LENGTHS.find((x) => x === Number(b.length)) ?? 10;
  if (goal.length < 8) throw new BadRequest("Describe what you want to find out in a sentence or two.");
  const d = normaliseDraft(await askClaudeJson({ prompt: draftPrompt(goal, audience, n), effort: "medium" }));
  if (!d.questions.length) return fail(502, "empty", "Claude couldn't draft the survey this time. Try rephrasing.");
  return json(200, d);
});

export const checkQuestions = aiRoute(async (req) => {
  const b = await readJson(req, 300_000);
  const questions = (Array.isArray(b.questions) ? b.questions : []).slice(0, 300).map(normaliseQuestion);
  if (!questions.some((q) => q.text)) throw new BadRequest("Write at least one question first.");
  const raw = await askClaudeJson({
    prompt: checkPrompt(text(b.title, 200), text(b.description, 2000), questions),
    effort: "medium",
  });
  return json(200, { items: normaliseCheck(raw, questions.length) });
});

export const readQuestionnaire = aiRoute(async (req) => {
  const b = await readJson(req, 300_000);
  const doc = text(b.text, 60_000);
  if (doc.length < 20) throw new BadRequest("There isn't enough text in this file to read.");
  const r = normaliseRead(await askClaudeJson({ prompt: readPrompt(doc), effort: "medium" }));
  if (!r.questions.length) return fail(502, "empty", "Claude didn't find any questions in this file.");
  return json(200, r);
});

/**
 * The owner's responses with the Analyze page's current view applied. Only filters that the page itself
 * offers are accepted, and a filter can never narrow the data to a group under MIN_GROUP people.
 */
async function analysisFor(db: Db, userId: string, surveyId: string, raw: unknown) {
  const a = await loadAnalysis(db, userId, surveyId); // owner check is in the query
  if (!a) return null;
  const f = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const includeFlagged = f.includeFlagged === true;
  let rows: ARow[] = a.rows.filter((r) => includeFlagged || r.status === "APPROVED");
  const key = text(f.key, 80),
    value = text(f.value, 200);
  if (key && value) {
    const allowed = SEGMENTS.some(([k]) => k === key) || a.questions.some((q) => isCategoryQ(q) && `q:${q.id}` === key);
    if (!allowed || !safeGroups(rows, key).groups.some(([g]) => g === value))
      throw new BadRequest("That filter isn't available for this survey.");
    rows = rows.filter((r) => segValue(r, key) === value);
  }
  const note = `${includeFlagged ? "including" : "excluding"} responses waiting for review${key && value ? `; only ${value}` : ""}`;
  if (!rows.length) throw new BadRequest("There are no responses to analyse with this view yet.");
  const title = a.survey.versions.find((v) => v.publishedAt)?.title ?? "";
  const description = a.survey.versions.find((v) => v.publishedAt)?.description ?? "";
  return {
    rows,
    note,
    summary: dataSummary({ title, description }, a.questions, rows, note, a.totals.flagged),
  };
}

export const askAnalyst = (surveyId: string) =>
  aiRoute(async (req, db, userId) => {
    const b = await readJson(req, 60_000);
    const turns = cleanTurns(b.messages);
    if (!turns) throw new BadRequest("Type a question first.");
    const data = await analysisFor(db, userId, surveyId, b.filter);
    if (!data) return fail(404, "not_found", "Survey not found.");
    const [first, ...rest] = turns;
    const messages = [
      { role: "user" as const, content: `${analystIntro(data.summary)}\n\n${first!.content}` },
      ...rest,
    ];
    const { text: answer, truncated } = await askClaude({ messages, effort: "medium", maxTokens: 8000 });
    return json(200, { text: answer, truncated, responses: data.rows.length });
  });

export const writeReport = (surveyId: string) =>
  aiRoute(async (req, db, userId) => {
    const b = await readJson(req, 5_000);
    const data = await analysisFor(db, userId, surveyId, b.filter);
    if (!data) return fail(404, "not_found", "Survey not found.");
    const raw = await askClaudeJson({ prompt: reportPrompt(data.summary), effort: "high", maxTokens: 32000 });
    const report = normaliseReport(raw, data.rows.length, data.note);
    if (!report) return fail(502, "empty", "Claude couldn't write the report this time. Try again.");
    // Saved for the owner only; the ownerId condition means nobody else's survey can be written to.
    await db.survey.updateMany({
      where: { id: surveyId, ownerId: userId },
      data: { aiReport: report as unknown as Prisma.InputJsonValue },
    });
    return json(200, { report });
  });
