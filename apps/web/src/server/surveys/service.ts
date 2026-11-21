import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { OPEN_SCREENING, normaliseQuestion, type QuestionInput, type Screening } from "@/lib/surveys";

type Db = PrismaClient | Prisma.TransactionClient;

export const withVersions = {
  versions: { orderBy: { number: "desc" }, include: { questions: { orderBy: { position: "asc" } } } },
} satisfies Prisma.SurveyInclude;

export type SurveyFull = Prisma.SurveyGetPayload<{ include: typeof withVersions }>;

export const latestVersion = (s: SurveyFull) => s.versions[0]!;
export const publishedVersion = (s: SurveyFull) => s.versions.find((v) => v.publishedAt) ?? null;

export function screeningOf(raw: unknown): Screening {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
  const n = (v: unknown, d: number) => (Number.isInteger(Number(v)) ? Number(v) : d);
  return {
    minAge: Math.max(18, n(s.minAge, 18)),
    maxAge: Math.min(120, n(s.maxAge, 120)),
    countries: list(s.countries),
    occupations: list(s.occupations),
  };
}
export { OPEN_SCREENING };

export const questionsForDb = (qs: QuestionInput[]) =>
  qs.map((q, position) => ({
    position,
    type: q.type,
    text: q.text,
    options: q.options,
    scale: q.scale ? { ...q.scale } : undefined,
    required: q.required,
  }));

export const questionView = (q: SurveyFull["versions"][number]["questions"][number]) => ({
  ...normaliseQuestion(q),
  id: q.id,
});

export async function loadSurvey(db: Db, id: string) {
  return db.survey.findUnique({ where: { id }, include: withVersions });
}

/** Responses that count towards the target: everything except rejected and the owner's own test answers. */
export const countingResponses = (db: Db, surveyId: string) =>
  db.response.count({ where: { surveyId, status: { not: "REJECTED" }, isTest: false } });
