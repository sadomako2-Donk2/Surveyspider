import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AQ, ARow } from "@/lib/analysis";
import type { AnswerValue } from "@/lib/surveys";
import { publishedVersion, questionView, withVersions } from "./service";

const signature = (q: AQ) => JSON.stringify([q.type, q.text, q.options, q.type === "RATING" ? q.scale : null]);

/** P001, P002… in order of submission, over every response, so codes match the Responses page. */
export async function participantCodes(db: PrismaClient, surveyId: string) {
  const all = await db.response.findMany({
    where: { surveyId },
    select: { id: true },
    orderBy: { submittedAt: "asc" },
  });
  return new Map(all.map((r, i) => [r.id, `P${String(i + 1).padStart(3, "0")}`]));
}

/**
 * Everything the Analyze page needs, for the survey's OWNER ONLY: the ownership check is part of the
 * database query, so no other account (site administrators included) can load answers through it.
 *
 * Answers to older versions count towards a question only when that question is identical
 * (same wording, type, options and scale) in the live version.
 */
export async function loadAnalysis(db: PrismaClient, ownerId: string, surveyId: string) {
  const survey = await db.survey.findFirst({ where: { id: surveyId, ownerId }, include: withVersions });
  if (!survey) return null;
  const live = publishedVersion(survey);
  if (!live)
    return {
      survey,
      questions: [] as AQ[],
      rows: [] as ARow[],
      totals: { all: 0, flagged: 0, rejected: 0 },
      versions: [] as number[],
    };
  const questions = live.questions.map(questionView);
  const bySignature = new Map(questions.map((q) => [signature(q), q.id]));
  const mapTo = new Map<string, string>();
  for (const v of survey.versions)
    for (const q of v.questions) {
      const target = bySignature.get(signature(questionView(q)));
      if (target) mapTo.set(q.id, target);
    }
  const [codes, responses] = await Promise.all([
    participantCodes(db, surveyId),
    db.response.findMany({
      where: { surveyId, isTest: false },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        durationSeconds: true,
        passedAttention: true,
        speeder: true,
        demographics: true,
        surveyVersion: { select: { number: true } },
        answers: { select: { questionId: true, value: true } },
      },
      orderBy: { submittedAt: "asc" },
    }),
  ]);
  const rows: ARow[] = responses
    .filter((r) => r.status !== "REJECTED")
    .map((r) => ({
      id: r.id,
      code: codes.get(r.id) ?? "P???",
      status: r.status as "APPROVED" | "FLAGGED",
      version: r.surveyVersion.number,
      submittedAt: r.submittedAt.toISOString(),
      durationSeconds: r.durationSeconds,
      passedAttention: r.passedAttention,
      speeder: r.speeder,
      demographics: (r.demographics as ARow["demographics"]) ?? null,
      answers: Object.fromEntries(
        r.answers.flatMap((a) => (mapTo.has(a.questionId) ? [[mapTo.get(a.questionId)!, a.value as AnswerValue]] : [])),
      ),
    }));
  return {
    survey,
    questions,
    rows,
    totals: {
      all: responses.length,
      flagged: responses.filter((r) => r.status === "FLAGGED").length,
      rejected: responses.filter((r) => r.status === "REJECTED").length,
    },
    versions: [...new Set(rows.map((r) => r.version))].sort((a, b) => a - b),
  };
}

/** What site administrators can see about surveys: counts only. This query never selects an answer. */
export async function adminSurveyTotals(db: PrismaClient) {
  const surveys = await db.survey.findMany({
    select: {
      id: true,
      status: true,
      createdAt: true,
      launchedAt: true,
      targetResponses: true,
      owner: { select: { email: true } },
      versions: { orderBy: { number: "desc" }, take: 1, select: { title: true, number: true } },
      _count: { select: { responses: { where: { isTest: false, status: { not: "REJECTED" } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return surveys.map((s) => ({
    id: s.id,
    title: s.versions[0]?.title ?? "",
    version: s.versions[0]?.number ?? 1,
    status: s.status,
    owner: s.owner.email,
    responses: s._count.responses,
    target: s.targetResponses,
    createdAt: s.createdAt,
    launchedAt: s.launchedAt,
  }));
}
