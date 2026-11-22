// AI prompts and the checks applied to what comes back. Pure functions, shared by the server routes and tests.
// Ported from Phase 1 (public/index.html: generateSurvey, runAiCheck, readWithAI, dataSummary, runChat, runReport).
// Claude only ever sees summaries built here from the owner's own data; groups under MIN_GROUP are never listed.
import {
  MIN_GROUP,
  SEGMENTS,
  defaultOutcome,
  drivers,
  fmtAvg,
  insights,
  safeGroups,
  scoreOf,
  summarise,
  type AQ,
  type ARow,
} from "@/lib/analysis";
import { QUESTION_TYPE_LABEL, scaleOf, type QuestionInput, type QuestionTypeCode } from "@/lib/surveys";

const str = (v: unknown, max: number) => (v == null ? "" : String(v).trim().slice(0, max));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

// ---------- questions from Claude ----------

const AI_TYPES = `- "type" is one of: "single" (choose one), "multi" (choose all that apply), "rating" (numbered scale), "likert" (labelled scale such as Strongly disagree … Strongly agree), "number", "text" (open answer).
- Put answer choices in "options" (for "likert", the labels from lowest to highest). Use [] for rating, number and text.
- For "rating" add "scale": {"min": 0 or 1, "max": 2 to 10, "minLabel": "...", "maxLabel": "..."}.`;

const TYPE_CODES: Record<string, QuestionTypeCode> = {
  single: "SINGLE",
  multi: "MULTI",
  rating: "RATING",
  likert: "LIKERT",
  number: "NUMBER",
  text: "TEXT",
};

/** Turns Claude's question list into valid builder questions. Anything unusable becomes open text or is dropped. */
export function normaliseAiQuestions(list: unknown, max = 60): QuestionInput[] {
  return arr(list)
    .slice(0, max)
    .map((raw): QuestionInput => {
      const q = obj(raw);
      let type: QuestionTypeCode = TYPE_CODES[String(q.type).toLowerCase()] ?? "TEXT";
      let options = [
        ...new Set(
          arr(q.options)
            .map((o) => str(o, 200))
            .filter(Boolean),
        ),
      ].slice(0, 30);
      const choice = type === "SINGLE" || type === "MULTI" || type === "LIKERT";
      if (choice && options.length < 2) type = "TEXT";
      if (!(type === "SINGLE" || type === "MULTI" || type === "LIKERT")) options = [];
      let scale = null;
      if (type === "RATING") {
        const s = obj(q.scale);
        const min = Number(s.min) === 0 ? 0 : 1;
        const max = Math.min(10, Math.max(2, Math.round(Number(s.max)) || 5));
        scale = { min, max, minLabel: str(s.minLabel, 60), maxLabel: str(s.maxLabel, 60) };
      }
      return { type, text: str(q.text, 500), options, scale, required: q.required !== false };
    })
    .filter((q) => q.text);
}

export const DRAFT_LENGTHS = [6, 10, 15] as const;

export function draftPrompt(goal: string, audience: string, n: number) {
  return `You are an expert survey designer for Afrimetrica Surveys, part of Afrimetrica, a research methods and analytics organisation.
Write an online survey for this goal: ${goal}
Who will answer: ${audience || "a general adult audience"}
Write about ${n} questions.
Reply with only JSON in this shape:
{"title": "string", "description": "string", "minutes": number, "questions": [{"type": "likert", "text": "string", "options": ["string"], "required": true}]}
${AI_TYPES}
Rules:
- Neutral, unbiased wording. One idea per question. Plain English.
- Start with easy questions; put sensitive ones later.
- Do not ask for age, gender, country or occupation: the platform already collects them. Never ask for a name, email or phone number.
- Use "likert" for agreement, satisfaction, frequency or importance; a 0–10 "rating" labelled "Not at all likely" / "Extremely likely" for likelihood to recommend.
- At most two "text" questions.
- "description" is 1–2 sentences shown to participants: the purpose, and that answers are anonymous.
- "minutes" is a realistic completion time.`;
}

export function normaliseDraft(raw: unknown) {
  const r = obj(raw);
  const questions = normaliseAiQuestions(r.questions);
  const minutes = Math.min(60, Math.max(2, Math.round(Number(r.minutes)) || Math.round(questions.length * 0.6)));
  return { title: str(r.title, 120), description: str(r.description, 800), minutes, questions };
}

export function readPrompt(text: string) {
  return `You convert a questionnaire document into online survey questions.
Reply with only JSON in exactly this shape:
{"title": "string", "description": "string", "questions": [{"type": "single", "text": "string", "options": ["string"], "required": true}]}
Rules:
- type is one of: "single" (choose one answer), "multi" (choose all that apply), "rating" (a numbered scale such as 1–5, 1–7, 1–9, 1–10 or 0–10), "likert" (a labelled scale such as Strongly disagree … Strongly agree, Never … Always, Very dissatisfied … Very satisfied), "number" (asks for a number, amount or age), "text" (open answer).
- Keep each question's wording as written, without its number. Put answer choices in "options" without letters, bullets or numbers. Use [] for rating, number and text.
- For "likert", put the scale labels in "options" from lowest to highest.
- For "rating", add "scale": {"min": 0 or 1, "max": a whole number from 2 to 10, "minLabel": "label of the lowest point, or empty", "maxLabel": "label of the highest point, or empty"}.
- A grid or matrix (several statements rated on the same scale) becomes one question per statement, each with the same scale.
- Skip headings, instructions, consent text, thank-you notes, and questions asking for a name, email, phone number or address.
- "title" is the questionnaire's title. "description" is one or two sentences from its introduction, or "".

Document:
"""
${text.slice(0, 60000)}
"""`;
}

export function normaliseRead(raw: unknown) {
  const r = obj(raw);
  return {
    title: str(r.title, 120),
    description: str(r.description, 600),
    questions: normaliseAiQuestions(r.questions, 300),
  };
}

// ---------- question checker ----------

const typeLabel = (q: QuestionInput) => QUESTION_TYPE_LABEL[q.type];

export function checkPrompt(title: string, description: string, questions: QuestionInput[]) {
  const list = questions
    .map((q, i) => {
      const sc = q.type === "RATING" ? scaleOf(q.scale) : null;
      return `Q${i + 1} [${typeLabel(q)}] ${q.text}${q.options.length ? ` | options: ${q.options.join(" / ")}` : ""}${sc ? ` | scale ${sc.min}–${sc.max}, labels: ${sc.minLabel} … ${sc.maxLabel}` : ""}`;
    })
    .join("\n");
  return `You review survey questions like an experienced research methodologist.
Survey: ${title}
Introduction: ${description}
Questions:
${list}
Report real problems only: leading or loaded wording, double-barrelled questions, vague terms or jargon, missing or overlapping answer options, unbalanced scales, or a question type that does not fit. At most 8 items. Do not mention questions that are fine.
Reply with only a JSON array: [{"q": question number, "issue": "one short sentence", "rewrite": "improved question text, or empty"}]. Reply [] if there are no problems.`;
}

export interface CheckItem {
  q: number;
  issue: string;
  rewrite: string;
}
export function normaliseCheck(raw: unknown, count: number): CheckItem[] {
  const list = Array.isArray(raw) ? raw : arr(obj(raw).items);
  return list
    .map(obj)
    .filter((x) => Number.isInteger(Number(x.q)) && Number(x.q) >= 1 && Number(x.q) <= count && str(x.issue, 300))
    .slice(0, 8)
    .map((x) => ({ q: Number(x.q), issue: str(x.issue, 300), rewrite: str(x.rewrite, 400) }));
}

// ---------- the data Claude sees for analysis ----------

const oneLine = (s: string, n: number) => s.replace(/\s+/g, " ").slice(0, n);

/**
 * A plain-text summary of the results, the only survey data sent to Claude for the analyst and the report.
 * Group breakdowns leave out groups under MIN_GROUP people; participant codes, ids and timings are never included.
 */
export function dataSummary(
  survey: { title: string; description: string },
  questions: AQ[],
  rows: ARow[],
  note: string,
  flagged = 0,
) {
  const L = [
    `Survey: ${survey.title}`,
    `Introduction: ${survey.description}`,
    `Responses analysed: ${rows.length} (${note})`,
  ];
  for (const [key, label] of SEGMENTS) {
    const g = safeGroups(rows, key);
    if (!g.groups.length && !g.hiddenPeople) continue;
    const parts = g.groups.slice(0, 8).map(([v, rs]) => `${v} ${rs.length}`);
    if (g.hiddenPeople) parts.push(`smaller groups combined ${g.hiddenPeople}`);
    L.push(`${label}: ${parts.join(", ")}`);
  }
  questions.forEach((q, i) => {
    L.push(`\nQ${i + 1} [${typeLabel(q)}] ${q.text}`);
    const s = summarise(q, rows);
    if (s.kind === "choice") {
      L.push(`${s.n} answered. ` + s.counts.map((c) => `${c.option}: ${c.count} (${c.pct}%)`).join("; "));
      if (s.top2 != null) L.push(`Top two answers combined: ${s.top2}%`);
      if (q.type === "LIKERT" && s.n) {
        const scores = rows.map((r) => scoreOf(q, r.answers[q.id])).filter((x): x is number => x != null);
        L.push(`Average score ${fmtAvg(q, scores.reduce((a, b) => a + b, 0) / scores.length)}`);
      }
    } else if (s.kind === "numeric") {
      if (s.stats) {
        const sc = q.type === "RATING" ? scaleOf(q.scale) : null;
        L.push(
          `${s.n} answered. Average ${s.stats.mean.toFixed(2)}, median ${s.stats.median}, lowest ${s.stats.min}, highest ${s.stats.max}${sc ? ` on a ${sc.min}–${sc.max} scale` : ""}`,
        );
        if (s.nps) L.push(`NPS ${s.nps.nps} (promoters ${s.nps.pro}%, detractors ${s.nps.det}%)`);
      } else L.push("No answers yet.");
    } else {
      L.push(`${s.n} written answers:`);
      s.answers.slice(0, 60).forEach((a) => L.push(`- ${oneLine(a, 220)}`));
      if (s.n > 60) L.push(`(${s.n - 60} more answers not shown)`);
    }
  });
  const ins = insights(questions, rows, { total: rows.length, flagged });
  if (ins.length) {
    L.push("\nAutomatic findings:");
    ins.forEach((c) => L.push(`- ${c.label}: ${c.title}. ${c.text}`));
  }
  const out = defaultOutcome(questions);
  if (out) {
    const dr = drivers(questions, rows, out)
      .filter((d) => d.r != null)
      .slice(0, 4);
    if (dr.length) {
      L.push(`\nCorrelations with "${questions.find((q) => q.id === out)!.text}":`);
      dr.forEach((d) => L.push(`- ${d.q.text}: r = ${d.r!.toFixed(2)} (n = ${d.n})`));
    }
  }
  return L.join("\n").slice(0, 90000);
}

export const ANALYST_SUGGESTIONS = [
  "What are the three main takeaways?",
  "Which group is least satisfied, and why?",
  "What should we change first?",
  "Summarise the written answers",
];

export function analystIntro(summary: string) {
  return `You are the AI Research Analyst inside Afrimetrica Surveys. You help a client understand their own survey results and decide what to do.
Rules: use only the survey data below. Quote numbers (counts, percentages, averages). If the data can't answer, say so plainly and suggest a question to add to a future survey. Never invent figures. Warn when a group is small (under 10 people) and never describe a group under ${MIN_GROUP} people. Correlation is not causation. Plain English, under 250 words, "-" bullets allowed, no markdown headings or tables. Do not try to identify individual participants.

Survey data:
${summary}`;
}

export function reportPrompt(summary: string) {
  return `You are a senior research analyst at Afrimetrica writing for a busy client. Using only the survey data below, write an insight report.
Reply with only JSON in this shape:
{"headline": "one sentence, the single most important finding", "summary": "3-4 sentence executive summary with numbers", "findings": [{"title": "short", "detail": "1-2 sentences with numbers"}], "themes": [{"theme": "short name", "share": "e.g. about 40% of comments", "quote": "a short paraphrase or quote"}], "recommendations": [{"action": "specific action", "why": "the evidence", "priority": "high" | "medium" | "low"}], "caveats": ["limits such as small groups or sample size"]}
Give 4-6 findings, up to 5 themes (only if there are written answers), and 3-5 recommendations. Each recommendation should say how to measure whether it worked. Plain English. Do not invent data. Never describe a group of fewer than ${MIN_GROUP} people.

Survey data:
${summary}`;
}

export interface AiReport {
  headline: string;
  summary: string;
  findings: { title: string; detail: string }[];
  themes: { theme: string; share: string; quote: string }[];
  recommendations: { action: string; why: string; priority: "high" | "medium" | "low" }[];
  caveats: string[];
  generatedAt: string;
  responses: number;
  basis: string;
}

export function normaliseReport(raw: unknown, responses: number, basis: string, now = new Date()): AiReport | null {
  const r = obj(raw);
  const rep: AiReport = {
    headline: str(r.headline, 300),
    summary: str(r.summary, 1500),
    findings: arr(r.findings)
      .slice(0, 8)
      .map(obj)
      .map((f) => ({ title: str(f.title, 160), detail: str(f.detail, 600) }))
      .filter((f) => f.title),
    themes: arr(r.themes)
      .slice(0, 6)
      .map(obj)
      .map((t) => ({ theme: str(t.theme, 100), share: str(t.share, 60), quote: str(t.quote, 300) }))
      .filter((t) => t.theme),
    recommendations: arr(r.recommendations)
      .slice(0, 6)
      .map(obj)
      .map((x) => ({
        action: str(x.action, 240),
        why: str(x.why, 500),
        priority: (["high", "medium", "low"] as const).find((p) => p === x.priority) ?? "medium",
      }))
      .filter((x) => x.action),
    caveats: arr(r.caveats)
      .slice(0, 5)
      .map((c) => str(c, 300))
      .filter(Boolean),
    generatedAt: now.toISOString(),
    responses,
    basis,
  };
  return rep.headline && rep.findings.length ? rep : null;
}

/** Keeps a conversation well-formed: alternating turns, starting and ending with the client. */
export function cleanTurns(raw: unknown, keep = 12): { role: "user" | "assistant"; content: string }[] | null {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const t of arr(raw).map(obj)) {
    const role = t.role === "user" || t.role === "assistant" ? t.role : null;
    const content = str(t.content, 4000);
    if (!role || !content) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n\n${content}`;
    else out.push({ role, content });
  }
  const recent = out.slice(-keep);
  while (recent.length && recent[0]!.role !== "user") recent.shift();
  return recent.length && recent[recent.length - 1]!.role === "user" ? recent : null;
}
