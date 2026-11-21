import "server-only";
import type { PrismaClient, ResponseStatus } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { toMinor } from "@/lib/academy";
import {
  ATTENTION,
  COUNTRIES,
  DEFAULT_CONSENT,
  GENDERS,
  OCCUPATIONS,
  checkAnswers,
  eligible,
  isSpeeder,
  normaliseQuestion,
  questionProblems,
  screensPeople,
} from "@/lib/surveys";
import { requireUser, requireVerified } from "../auth/guards";
import { handle } from "../auth/handlers";
import { BadRequest, fail, json, readJson } from "../http";
import {
  countingResponses,
  latestVersion,
  loadSurvey,
  publishedVersion,
  questionView,
  questionsForDb,
  screeningOf,
  type SurveyFull,
} from "./service";

class Conflict extends Error {}
const guard = async (fn: () => Promise<Response>) => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Conflict) return fail(409, "conflict", e.message);
    throw e;
  }
};
/** A question without its database id, for comparing wording and options. */
const contentOnly = (q: { type: string; text: string; options: string[]; scale?: unknown; required: boolean }) => [
  q.type,
  q.text,
  q.options,
  q.scale ?? null,
  q.required,
];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function parseContent(b: Record<string, unknown>) {
  const questions = Array.isArray(b.questions) ? b.questions.slice(0, 301).map(normaliseQuestion) : [];
  return {
    title: text(b.title, 200),
    description: text(b.description, 2000),
    consentText: typeof b.consentText === "string" ? text(b.consentText, 2000) : DEFAULT_CONSENT,
    questions,
  };
}
function parseSettings(b: Record<string, unknown>) {
  const rewardMinor = toMinor(b.reward ?? 0);
  if (Number.isNaN(rewardMinor) || rewardMinor > 100_000)
    throw new BadRequest("Enter the reward in US dollars, like 1.50 (at most $1,000).");
  const target = Number(b.target ?? 100),
    minutes = Number(b.minutes ?? 10);
  if (!Number.isInteger(target) || target < 1 || target > 100_000)
    throw new BadRequest("The number of responses wanted must be a whole number from 1 to 100,000.");
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)
    throw new BadRequest("The time to complete must be between 1 and 240 minutes.");
  const screening = screeningOf(b.screening);
  if (screening.minAge > screening.maxAge) throw new BadRequest("The minimum age is above the maximum age.");
  if (
    screening.countries.some((c) => !COUNTRIES.includes(c)) ||
    screening.occupations.some((o) => !OCCUPATIONS.includes(o))
  )
    throw new BadRequest("Choose countries and occupations from the lists.");
  return {
    rewardMinor,
    targetResponses: target,
    estimatedMinutes: minutes,
    screening: { ...screening },
    attentionCheck: b.attentionCheck !== false,
  };
}

/** What the owner's builder needs. */
export function ownerView(s: SurveyFull, counts: { responses: number }) {
  const latest = latestVersion(s),
    pub = publishedVersion(s);
  return {
    id: s.id,
    status: s.status,
    title: latest.title,
    description: latest.description,
    consentText: latest.consentText,
    questions: latest.questions.map(questionView),
    version: { number: latest.number, published: !!latest.publishedAt, liveNumber: pub?.number ?? null },
    reward: (s.rewardMinor / 100).toFixed(2),
    target: s.targetResponses,
    minutes: s.estimatedMinutes,
    screening: screeningOf(s.screening),
    attentionCheck: s.attentionCheck,
    responses: counts.responses,
    updatedAt: s.updatedAt,
  };
}
export type OwnerSurvey = ReturnType<typeof ownerView>;

async function ownSurvey(db: PrismaClient, req: Request, id: string) {
  const { user, error } = await requireUser(db, req);
  if (error) return { error };
  const s = await loadSurvey(db, id);
  // Same answer for "doesn't exist" and "not yours", so ids can't be probed.
  if (!s || s.ownerId !== user.id) return { error: fail(404, "not_found", "Survey not found.") };
  return { user, survey: s };
}

// ---------- owners ----------

export const listMySurveys = handle(async (req, db) => {
  const { user, error } = await requireUser(db, req);
  if (error) return error;
  const surveys = await db.survey.findMany({
    where: { ownerId: user.id },
    include: {
      versions: { orderBy: { number: "desc" }, take: 1, select: { title: true, number: true, publishedAt: true } },
      _count: { select: { responses: { where: { isTest: false } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return json(200, {
    surveys: surveys.map((s) => ({
      id: s.id,
      title: s.versions[0]?.title ?? "",
      status: s.status,
      responses: s._count.responses,
      target: s.targetResponses,
      updatedAt: s.updatedAt,
    })),
  });
});

export const createSurvey = handle(async (req, db) => {
  const { user, error } = await requireUser(db, req);
  if (error) return error;
  const b = await readJson(req, 400_000);
  const content = parseContent(b),
    settings = parseSettings(b);
  const s = await db.survey.create({
    data: {
      ownerId: user.id,
      ...settings,
      versions: {
        create: {
          number: 1,
          title: content.title,
          description: content.description,
          consentText: content.consentText,
          questions: { create: questionsForDb(content.questions) },
        },
      },
    },
  });
  return json(200, { id: s.id });
});

export const getMySurvey = (id: string) =>
  handle(async (req, db) => {
    const r = await ownSurvey(db, req, id);
    if (r.error) return r.error;
    return json(200, { survey: ownerView(r.survey, { responses: await countingResponses(db, id) }) });
  });

/**
 * Saves the builder. Draft content replaces the draft version; once a version is published it is never changed,
 * so the edit becomes the next draft version. Pay and audience can't change once people have answered.
 */
export const saveSurvey = (id: string) =>
  handle(async (req, db) => {
    const r = await ownSurvey(db, req, id);
    if (r.error) return r.error;
    const b = await readJson(req, 400_000);
    const content = parseContent(b),
      settings = parseSettings(b);
    return guard(async () => {
      await db.$transaction(async (tx) => {
        const answered = await tx.response.count({ where: { surveyId: id, isTest: false } });
        const s = r.survey;
        if (answered > 0) {
          const changed =
            settings.rewardMinor !== s.rewardMinor ||
            settings.estimatedMinutes !== s.estimatedMinutes ||
            settings.attentionCheck !== s.attentionCheck ||
            JSON.stringify(settings.screening) !== JSON.stringify(screeningOf(s.screening));
          if (changed)
            throw new Conflict(
              "People have already answered, so the reward, time, audience and attention check can't change. You can still raise the number of responses wanted.",
            );
          if (settings.targetResponses < answered)
            throw new Conflict(`${answered} people have already answered; the number wanted can't be lower than that.`);
        }
        await tx.survey.update({ where: { id }, data: settings });
        const latest = latestVersion(s);
        if (!latest.publishedAt) {
          await tx.question.deleteMany({ where: { versionId: latest.id } });
          await tx.surveyVersion.update({
            where: { id: latest.id },
            data: {
              title: content.title,
              description: content.description,
              consentText: content.consentText,
              questions: { create: questionsForDb(content.questions) },
            },
          });
        } else {
          const same =
            JSON.stringify(latest.questions.map(questionView).map(contentOnly)) ===
            JSON.stringify(content.questions.map(contentOnly));
          if (
            !same ||
            latest.title !== content.title ||
            latest.description !== content.description ||
            latest.consentText !== content.consentText
          )
            await tx.surveyVersion.create({
              data: {
                surveyId: id,
                number: latest.number + 1,
                title: content.title,
                description: content.description,
                consentText: content.consentText,
                questions: { create: questionsForDb(content.questions) },
              },
            });
        }
      });
      const fresh = (await loadSurvey(db, id))!;
      return json(200, { survey: ownerView(fresh, { responses: await countingResponses(db, id) }) });
    });
  });

/** Publishes the latest draft version and opens the survey. */
export const publishSurvey = (id: string) =>
  handle(async (req, db) => {
    const v = await requireVerified(db, req, "launch surveys");
    if (v.error) return v.error;
    const r = await ownSurvey(db, req, id);
    if (r.error) return r.error;
    const latest = latestVersion(r.survey);
    if (latest.publishedAt) return fail(409, "conflict", "There are no unpublished changes.");
    const problems = [
      !latest.title && "Give the survey a title.",
      !latest.consentText && "Add a consent statement for participants.",
      ...questionProblems(latest.questions.map(questionView)),
    ].filter((x): x is string => !!x);
    if (problems.length) return fail(400, "invalid_argument", problems.join(" "));
    await db.$transaction([
      db.surveyVersion.update({ where: { id: latest.id }, data: { publishedAt: new Date() } }),
      db.survey.update({ where: { id }, data: { status: "LIVE", launchedAt: r.survey.launchedAt ?? new Date() } }),
    ]);
    return json(200, { status: "LIVE", version: latest.number });
  });

export const setSurveyStatus = (id: string) =>
  handle(async (req, db) => {
    const r = await ownSurvey(db, req, id);
    if (r.error) return r.error;
    const status = (await readJson(req)).status;
    if (status !== "LIVE" && status !== "CLOSED")
      return fail(400, "invalid_argument", "Status must be LIVE or CLOSED.");
    if (!publishedVersion(r.survey)) return fail(409, "conflict", "Publish the survey first.");
    await db.survey.update({ where: { id }, data: { status } });
    return json(200, { status });
  });

export const deleteSurvey = (id: string) =>
  handle(async (req, db) => {
    const r = await ownSurvey(db, req, id);
    if (r.error) return r.error;
    if (publishedVersion(r.survey))
      return fail(409, "conflict", "This survey has been published, so it can't be deleted. Close it instead.");
    await db.survey.delete({ where: { id } });
    return json(204, null);
  });

// ---------- participants ----------

export const getProfile = handle(async (req, db) => {
  const { user, error } = await requireUser(db, req);
  if (error) return error;
  return json(200, {
    profile: await db.participantProfile.findUnique({
      where: { userId: user.id },
      select: { age: true, gender: true, country: true, occupation: true },
    }),
  });
});

export const saveProfile = handle(async (req, db) => {
  const { user, error } = await requireUser(db, req);
  if (error) return error;
  const b = await readJson(req);
  const age = Number(b.age);
  if (!Number.isInteger(age) || age < 18 || age > 120)
    return fail(400, "invalid_argument", "Enter an age of 18 or over.");
  const gender = String(b.gender ?? ""),
    country = String(b.country ?? ""),
    occupation = String(b.occupation ?? "");
  if (!GENDERS.includes(gender) || !COUNTRIES.includes(country) || !OCCUPATIONS.includes(occupation))
    return fail(400, "invalid_argument", "Choose an answer for gender, country and occupation.");
  const data = { age, gender, country, occupation };
  await db.participantProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });
  return json(200, { profile: data });
});

export const submitResponse = (id: string) =>
  handle(async (req, db) => {
    const { user, error } = await requireVerified(db, req, "take surveys");
    if (error) return error;
    const b = await readJson(req, 200_000);
    const s = await loadSurvey(db, id);
    if (!s || s.status !== "LIVE") return fail(404, "not_found", "This survey isn't open.");
    const v = publishedVersion(s)!;
    if (b.versionId !== v.id)
      return fail(
        409,
        "conflict",
        "This survey was updated while you were answering. Please reload the page and answer again.",
      );
    if (b.consent !== true) return fail(400, "invalid_argument", "Tick the consent box to take part.");
    const profile = await db.participantProfile.findUnique({ where: { userId: user.id } });
    const screening = screeningOf(s.screening);
    if (!eligible(screening, profile))
      return fail(
        403,
        "not_eligible",
        profile ? "This survey is looking for different participants." : "Set up your participant profile first.",
      );
    const raw =
      b.answers && typeof b.answers === "object" && !Array.isArray(b.answers)
        ? (b.answers as Record<string, unknown>)
        : {};
    const questions = v.questions.map(questionView);
    const { answers, missing, invalid, unknown } = checkAnswers(questions, raw);
    if (unknown.length)
      return fail(400, "invalid_argument", "Some answers don't belong to this survey. Please reload the page.");
    if (invalid.length)
      return fail(
        400,
        "invalid_argument",
        `Please check your answer to question${invalid.length > 1 ? "s" : ""} ${invalid.join(", ")}.`,
      );
    if (missing.length)
      return fail(
        400,
        "invalid_argument",
        `Please answer question${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`,
      );
    const passedAttention = s.attentionCheck ? raw[ATTENTION.key] === ATTENTION.answer : null;
    const seconds = Number(b.durationSeconds);
    const durationSeconds = Number.isFinite(seconds) && seconds >= 0 ? Math.min(Math.round(seconds), 86_400) : null;
    const speeder = isSpeeder(durationSeconds, s.estimatedMinutes);
    const isTest = s.ownerId === user.id;

    return guard(async () => {
      const response = await db.$transaction(async (tx) => {
        // Lock the survey row so two people can't both take the last place.
        await tx.$queryRaw`SELECT id FROM "Survey" WHERE id = ${id} FOR UPDATE`;
        if (
          await tx.response.findUnique({ where: { surveyId_participantId: { surveyId: id, participantId: user.id } } })
        )
          throw new Conflict("You have already taken this survey.");
        if (!isTest && (await countingResponses(tx, id)) >= s.targetResponses)
          throw new Conflict("This survey has all the responses it needs. Thanks for your interest.");
        const consent = await tx.consentRecord.create({
          data: { surveyVersionId: v.id, participantId: user.id, statement: v.consentText },
        });
        try {
          return await tx.response.create({
            data: {
              surveyId: id,
              surveyVersionId: v.id,
              participantId: user.id,
              consentRecordId: consent.id,
              isTest,
              status: passedAttention !== false && !speeder ? "APPROVED" : "FLAGGED",
              rewardMinor: isTest ? 0 : s.rewardMinor,
              rewardCurrency: s.rewardCurrency,
              passedAttention,
              speeder,
              durationSeconds,
              demographics: profile
                ? { age: profile.age, gender: profile.gender, country: profile.country, occupation: profile.occupation }
                : Prisma.JsonNull,
              answers: { create: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })) },
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
            throw new Conflict("You have already taken this survey.");
          throw e;
        }
      });
      return json(200, { id: response.id, status: response.status, test: isTest });
    });
  });

/** Live surveys this person can take now: not theirs, not answered, not full, and they match the screening. */
export const openSurveys = handle(async (req, db) => {
  const { user, error } = await requireUser(db, req);
  if (error) return error;
  const profile = await db.participantProfile.findUnique({ where: { userId: user.id } });
  const surveys = await db.survey.findMany({
    where: { status: "LIVE", ownerId: { not: user.id }, responses: { none: { participantId: user.id } } },
    include: {
      versions: {
        where: { publishedAt: { not: null } },
        orderBy: { number: "desc" },
        take: 1,
        select: { title: true, description: true, _count: { select: { questions: true } } },
      },
    },
    orderBy: { launchedAt: "desc" },
    take: 200,
  });
  const out = [];
  for (const s of surveys) {
    const sc = screeningOf(s.screening);
    if (!eligible(sc, profile)) continue;
    if ((await countingResponses(db, s.id)) >= s.targetResponses) continue;
    const v = s.versions[0]!;
    out.push({
      id: s.id,
      title: v.title,
      description: v.description,
      questions: v._count.questions,
      minutes: s.estimatedMinutes,
      reward: s.rewardMinor,
      screened: screensPeople(sc),
    });
  }
  return json(200, { surveys: out, hasProfile: !!profile });
});

// ---------- survey owners reviewing answers ----------

/**
 * Answers are shown ONLY to the survey's owner. Site administrators get no special access here
 * (blueprint rule: administrators don't automatically read confidential survey answers).
 */
export const listResponses = (id: string) =>
  handle(async (req, db) => {
    const r = await ownSurvey(db, req, id);
    if (r.error) return r.error;
    const rows = await db.response.findMany({
      where: { surveyId: id },
      include: { answers: { select: { questionId: true, value: true } }, surveyVersion: { select: { number: true } } },
      orderBy: { submittedAt: "asc" },
    });
    return json(200, {
      responses: rows.map((x) => ({
        id: x.id,
        // Participants are shown by a per-survey code, not their account id or email.
        participant: `P${String(rows.indexOf(x) + 1).padStart(3, "0")}`,
        version: x.surveyVersion.number,
        status: x.status,
        isTest: x.isTest,
        passedAttention: x.passedAttention,
        speeder: x.speeder,
        durationSeconds: x.durationSeconds,
        demographics: x.demographics,
        submittedAt: x.submittedAt,
        answers: Object.fromEntries(x.answers.map((a) => [a.questionId, a.value])),
      })),
    });
  });

export const reviewResponse = (responseId: string) =>
  handle(async (req, db) => {
    const { user, error } = await requireUser(db, req);
    if (error) return error;
    const status = (await readJson(req)).status as ResponseStatus;
    if (!["APPROVED", "FLAGGED", "REJECTED"].includes(status))
      return fail(400, "invalid_argument", "Status must be APPROVED, FLAGGED or REJECTED.");
    const resp = await db.response.findUnique({
      where: { id: responseId },
      include: { survey: { select: { ownerId: true } } },
    });
    if (!resp || resp.survey.ownerId !== user.id) return fail(404, "not_found", "Response not found.");
    await db.response.update({ where: { id: responseId }, data: { status } });
    return json(200, { id: responseId, status });
  });
