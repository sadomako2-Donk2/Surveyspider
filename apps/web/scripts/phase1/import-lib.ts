// Step 9: copies Phase 1's store.json into the Phase 2 database.
//
// - Everything happens in ONE database transaction. A dry run does the whole import and then rolls it back,
//   so the report shows exactly what --apply would do, with every database rule checked.
// - Safe to run again: records are matched on `legacyId` (the Phase 1 id) and never imported twice.
//   Nothing that is already in the Phase 2 database is changed, except linking an account that has the
//   same email address (it gets the Phase 1 id, and the Phase 1 password if it has none).
// - Nothing is invented. Anything that can't be carried across is skipped and listed in the report with
//   its Phase 1 id and the reason. The report never contains names, emails or answers.
// - Sign-in sessions and email links are not copied: everyone signs in again on the new site.
import { Prisma, type PrismaClient } from "../../src/generated/prisma/client";
import { slugify } from "../../src/lib/academy";
import { DEFAULT_CONSENT, normaliseQuestion } from "../../src/lib/surveys";

type Obj = Record<string, unknown>;
type Tx = Prisma.TransactionClient;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const objs = (v: unknown): Obj[] => (isObj(v) ? Object.values(v).filter(isObj) : []);
const str = (v: unknown, max: number) => (v == null ? "" : String(v).trim().slice(0, max));
const date = (v: unknown, fallback: Date | null = null): Date | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v ? Date.parse(v) : NaN;
  return Number.isFinite(n) && n > 0 ? new Date(n) : fallback;
};
const day = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null;
const minor = (v: unknown) => Math.max(0, Math.round((Number(v) || 0) * 100));
const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Phase 1 password hashes: scrypt, N=16384, r=8, p=1, 64-byte key, hex salt used as text (see src/server/auth/password.ts). */
export const phase1PasswordHash = (salt: string, passHash: string) => `scrypt$16384$8$1$${salt}$${passHash}`;

export const ENTITIES = [
  "users",
  "profiles",
  "courses",
  "courseSessions",
  "enrollments",
  "surveys",
  "responses",
  "answers",
  "actions",
  "enquiries",
  "fieldwork",
  "settings",
] as const;
export type Entity = (typeof ENTITIES)[number];

export interface ImportReport {
  mode: "dry-run" | "applied";
  counts: Record<Entity, { found: number; imported: number; alreadyThere: number; linked: number; skipped: number }>;
  /** One line per skipped record: Phase 1 id and reason. No personal details. */
  skipped: { entity: Entity; legacyId: string; reason: string }[];
  warnings: string[];
}

class DryRunRollback extends Error {}

export async function importPhase1(db: PrismaClient, store: unknown, opts: { apply: boolean }): Promise<ImportReport> {
  if (!isObj(store)) throw new Error("That file isn't a Phase 1 store.json (expected a JSON object).");
  const report: ImportReport = {
    mode: opts.apply ? "applied" : "dry-run",
    counts: Object.fromEntries(
      ENTITIES.map((e) => [e, { found: 0, imported: 0, alreadyThere: 0, linked: 0, skipped: 0 }]),
    ) as ImportReport["counts"],
    skipped: [],
    warnings: [],
  };
  const count = (e: Entity, k: "found" | "imported" | "alreadyThere" | "linked", n = 1) => (report.counts[e][k] += n);
  const skip = (entity: Entity, legacyId: unknown, reason: string) => {
    report.counts[entity].skipped++;
    report.skipped.push({ entity, legacyId: str(legacyId, 120) || "(no id)", reason });
  };
  try {
    await db.$transaction(
      async (tx) => {
        const users = await importUsers(tx, store, count, skip, report);
        await importProfiles(tx, store, users, count, skip);
        const sessions = await importCourses(tx, store, count, skip, report);
        await importEnrollments(tx, store, users, sessions, count, skip);
        const surveys = await importSurveys(tx, store, users, count, skip, report);
        await importResponses(tx, store, users, surveys, count, skip, report);
        await importActions(tx, store, users, surveys, count, skip);
        await importEnquiries(tx, store, users, count, skip);
        await importFieldwork(tx, store, users, count, skip);
        await importSettings(tx, store, count);
        if (!opts.apply) throw new DryRunRollback();
      },
      { timeout: 30 * 60 * 1000, maxWait: 60 * 1000 },
    );
  } catch (e) {
    if (!(e instanceof DryRunRollback)) throw e;
  }
  return report;
}

type Count = (e: Entity, k: "found" | "imported" | "alreadyThere" | "linked", n?: number) => void;
type Skip = (e: Entity, legacyId: unknown, reason: string) => void;

// ---------- people ----------

async function importUsers(tx: Tx, store: Obj, count: Count, skip: Skip, report: ImportReport) {
  const map = new Map<string, string>(); // Phase 1 user id -> Phase 2 user id
  for (const u of objs(store.users)) {
    count("users", "found");
    const legacyId = str(u.id, 120);
    const email = str(u.email, 160).toLowerCase();
    if (!legacyId) {
      skip("users", u.id, "no id");
      continue;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      skip("users", legacyId, "no valid email address");
      continue;
    }
    const done = await tx.user.findUnique({ where: { legacyId }, select: { id: true } });
    if (done) {
      map.set(legacyId, done.id);
      count("users", "alreadyThere");
      continue;
    }
    const passwordHash =
      typeof u.salt === "string" && typeof u.passHash === "string" && /^[0-9a-f]+$/.test(u.passHash)
        ? phase1PasswordHash(u.salt, u.passHash)
        : null;
    let googleSubject = str(u.googleSub, 200) || null;
    const createdAt = date(u.createdAt, new Date())!;
    // Accounts made before email confirmation existed count as confirmed (same rule as Phase 1).
    const emailVerifiedAt = u.emailVerified === false ? null : createdAt;
    const sameEmail = await tx.user.findUnique({ where: { email } });
    if (googleSubject) {
      const other = await tx.user.findUnique({ where: { googleSubject }, select: { id: true } });
      if (other && other.id !== sameEmail?.id) {
        report.warnings.push(
          `User ${legacyId}: Google sign-in is already linked to another account, so it wasn't copied.`,
        );
        googleSubject = null;
      }
    }
    if (sameEmail) {
      // Someone already signed up on the new site with this address: link the two instead of making a second account.
      if (sameEmail.legacyId) {
        skip("users", legacyId, "an account with this email is already linked to a different Phase 1 account");
        continue;
      }
      await tx.user.update({
        where: { id: sameEmail.id },
        data: {
          legacyId,
          passwordHash: sameEmail.passwordHash ?? passwordHash,
          googleSubject: sameEmail.googleSubject ?? googleSubject,
          emailVerifiedAt: sameEmail.emailVerifiedAt ?? emailVerifiedAt,
          name: sameEmail.name || str(u.name, 80),
        },
      });
      map.set(legacyId, sameEmail.id);
      count("users", "linked");
      continue;
    }
    const created = await tx.user.create({
      data: { legacyId, email, name: str(u.name, 80), passwordHash, googleSubject, emailVerifiedAt, createdAt },
    });
    map.set(legacyId, created.id);
    count("users", "imported");
  }
  return map;
}

async function importProfiles(tx: Tx, store: Obj, users: Map<string, string>, count: Count, skip: Skip) {
  if (!isObj(store.profiles)) return;
  for (const [uid, p] of Object.entries(store.profiles)) {
    if (!isObj(p)) continue;
    count("profiles", "found");
    const userId = users.get(uid);
    if (!userId) {
      skip("profiles", uid, "belongs to a visitor without an account");
      continue;
    }
    const age = Math.floor(Number(p.age));
    if (!(age >= 18 && age <= 120)) {
      skip("profiles", uid, "age missing or under 18");
      continue;
    }
    if (await tx.participantProfile.findUnique({ where: { userId }, select: { userId: true } })) {
      count("profiles", "alreadyThere");
      continue;
    }
    await tx.participantProfile.create({
      data: {
        userId,
        age,
        gender: str(p.gender, 40),
        country: str(p.country, 60),
        occupation: str(p.occupation, 60),
      },
    });
    count("profiles", "imported");
  }
}

// ---------- Academy ----------

const CURRENCIES = ["USD", "GHS", "GBP", "EUR"] as const;

async function importCourses(tx: Tx, store: Obj, count: Count, skip: Skip, report: ImportReport) {
  const sessions = new Map<string, { courseId: string; sessionId: string | null }>(); // "course|session" -> ids
  for (const c of objs(store.courses)) {
    count("courses", "found");
    const legacyId = str(c.id, 120);
    const title = str(c.title, 150);
    if (!legacyId || !title) {
      skip("courses", c.id, "no id or title");
      continue;
    }
    const list = (Array.isArray(c.sessions) ? c.sessions : []).filter(isObj);
    count("courseSessions", "found", list.length);
    let course = await tx.course.findUnique({ where: { legacyId }, include: { sessions: true } });
    if (course) count("courses", "alreadyThere");
    else {
      let slug = slugify(title);
      for (let i = 2; await tx.course.findUnique({ where: { slug }, select: { id: true } }); i++)
        slug = `${slugify(title)}-${i}`;
      course = await tx.course.create({
        data: {
          legacyId,
          slug,
          title,
          status: c.status === "published" ? "PUBLISHED" : "DRAFT",
          level: str(c.level, 40),
          format: str(c.format, 40),
          duration: str(c.duration, 80),
          summary: str(c.summary, 400),
          description: str(c.description, 6000),
          audience: str(c.audience, 400),
          outcomes: (Array.isArray(c.outcomes) ? c.outcomes : []).map((o) => str(o, 200)).filter(Boolean),
          certificate: c.certificate !== false,
          createdAt: date(c.createdAt, new Date())!,
        },
        include: { sessions: true },
      });
      count("courses", "imported");
    }
    sessions.set(`${legacyId}|`, { courseId: course.id, sessionId: null });
    for (const s of list) {
      const sid = str(s.id, 120);
      if (!sid) {
        skip("courseSessions", `${legacyId}/?`, "no id");
        continue;
      }
      const have = await tx.courseSession.findUnique({ where: { legacyId: `${legacyId}/${sid}` } });
      if (have) {
        sessions.set(`${legacyId}|${sid}`, { courseId: course.id, sessionId: have.id });
        count("courseSessions", "alreadyThere");
        continue;
      }
      const startsOn = day(s.start);
      let endsOn = day(s.end);
      if (startsOn && endsOn && endsOn < startsOn) {
        report.warnings.push(
          `Course ${legacyId}, date ${sid}: the end date was before the start date, so it was left out.`,
        );
        endsOn = null;
      }
      const created = await tx.courseSession.create({
        data: {
          // Phase 1 session ids are only unique within a course.
          legacyId: `${legacyId}/${sid}`,
          courseId: course.id,
          startsOn,
          endsOn,
          location: str(s.location, 120),
          seats: Math.max(0, Math.min(10000, Math.floor(Number(s.seats) || 0))),
          feeMinor: minor(s.fee),
          currency: CURRENCIES.find((x) => x === s.currency) ?? "USD",
        },
      });
      sessions.set(`${legacyId}|${sid}`, { courseId: course.id, sessionId: created.id });
      count("courseSessions", "imported");
    }
  }
  return sessions;
}

const ENROL = ["registered", "interest", "confirmed", "attended", "completed", "cancelled"];

async function importEnrollments(
  tx: Tx,
  store: Obj,
  users: Map<string, string>,
  sessions: Map<string, { courseId: string; sessionId: string | null }>,
  count: Count,
  skip: Skip,
) {
  for (const e of objs(store.enrollments)) {
    count("enrollments", "found");
    const legacyId = str(e.id, 120);
    if (!legacyId) {
      skip("enrollments", e.id, "no id");
      continue;
    }
    if (await tx.enrollment.findUnique({ where: { legacyId }, select: { id: true } })) {
      count("enrollments", "alreadyThere");
      continue;
    }
    const userId = users.get(str(e.userId, 120));
    const target = sessions.get(`${str(e.courseId, 120)}|${str(e.sessionId, 120)}`);
    const status = ENROL.includes(String(e.status))
      ? (String(e.status).toUpperCase() as Prisma.EnrollmentCreateInput["status"] & string)
      : null;
    if (!userId) {
      skip("enrollments", legacyId, "the person's account wasn't imported");
      continue;
    }
    if (!target) {
      skip("enrollments", legacyId, "the course or date no longer exists");
      continue;
    }
    if (!status) {
      skip("enrollments", legacyId, "unknown status");
      continue;
    }
    if (
      status !== "CANCELLED" &&
      (await tx.enrollment.findFirst({
        where: { userId, courseId: target.courseId, sessionId: target.sessionId, status: { not: "CANCELLED" } },
        select: { id: true },
      }))
    ) {
      skip("enrollments", legacyId, "the same person already has an active registration for this course and date");
      continue;
    }
    const createdAt = date(e.createdAt, new Date())!;
    await tx.enrollment.create({
      data: {
        legacyId,
        userId,
        courseId: target.courseId,
        sessionId: target.sessionId,
        status,
        name: str(e.name, 80),
        email: str(e.email, 160).toLowerCase(),
        phone: str(e.phone, 40),
        organisation: str(e.organisation, 120),
        notes: str(e.notes, 1000),
        createdAt,
        updatedAt: date(e.updatedAt, createdAt)!,
      },
    });
    count("enrollments", "imported");
  }
}

// ---------- surveys ----------

interface SurveyRef {
  surveyId: string;
  versionId: string | null; // the published version, if any
  questions: Map<string, string>; // Phase 1 question id -> Phase 2 question id
}
const SURVEY_STATUS = { draft: "DRAFT", live: "LIVE", closed: "CLOSED" } as const;

/** Phase 1 AI reports used numbers for dates and `n` for the response count. */
function convertReport(r: unknown) {
  if (!isObj(r) || !str(r.headline, 300)) return undefined;
  return json({
    headline: str(r.headline, 300),
    summary: str(r.summary, 1500),
    findings: Array.isArray(r.findings) ? r.findings.filter(isObj) : [],
    themes: Array.isArray(r.themes) ? r.themes.filter(isObj) : [],
    recommendations: Array.isArray(r.recommendations) ? r.recommendations.filter(isObj) : [],
    caveats: Array.isArray(r.caveats) ? r.caveats.map((c) => str(c, 300)) : [],
    generatedAt: (date(r.generatedAt) ?? new Date()).toISOString(),
    responses: Number(r.n) || 0,
    basis: "written on the previous site",
  });
}

async function importSurveys(
  tx: Tx,
  store: Obj,
  users: Map<string, string>,
  count: Count,
  skip: Skip,
  report: ImportReport,
) {
  const map = new Map<string, SurveyRef>();
  const studies = objs(store.studies);
  const answered = new Set(objs(store.responses).map((r) => str(r.studyId, 120)));
  let consentAdded = 0;
  for (const s of studies) {
    count("surveys", "found");
    const legacyId = str(s.id, 120);
    if (!legacyId) {
      skip("surveys", s.id, "no id");
      continue;
    }
    const done = await tx.survey.findUnique({
      where: { legacyId },
      include: { versions: { include: { questions: true }, orderBy: { number: "asc" } } },
    });
    if (done) {
      const v = done.versions[0]; // version 1 holds the Phase 1 questions and answers
      map.set(legacyId, {
        surveyId: done.id,
        versionId: v?.publishedAt ? v.id : null,
        questions: new Map((v?.questions ?? []).filter((q) => q.legacyId).map((q) => [q.legacyId!, q.id])),
      });
      count("surveys", "alreadyThere");
      continue;
    }
    const ownerId = users.get(str(s.ownerId, 120));
    if (!ownerId) {
      skip("surveys", legacyId, "the owner's account wasn't imported (made by a visitor without an account?)");
      continue;
    }
    if (!Array.isArray(s.questions)) {
      skip("surveys", legacyId, "no question list");
      continue;
    }
    let status: "DRAFT" | "LIVE" | "CLOSED" = SURVEY_STATUS[String(s.status) as keyof typeof SURVEY_STATUS] ?? "DRAFT";
    if (status === "DRAFT" && answered.has(legacyId)) {
      report.warnings.push(`Survey ${legacyId} was a draft but had responses; it was imported as closed.`);
      status = "CLOSED";
    }
    const questions = (s.questions as unknown[]).filter(isObj).slice(0, 300);
    const createdAt = date(s.createdAt) ?? date(s.launchedAt) ?? date(s.updatedAt, new Date())!;
    const launchedAt = status === "DRAFT" ? null : (date(s.launchedAt) ?? createdAt);
    const screen = isObj(s.screen) ? s.screen : {};
    const library = isObj(s.library) ? s.library : null;
    const survey = await tx.survey.create({
      data: {
        legacyId,
        ownerId,
        status,
        rewardMinor: minor(s.reward),
        targetResponses: Math.max(0, Math.floor(Number(s.target) || 0)),
        estimatedMinutes: Math.max(0, Math.floor(Number(s.minutes) || 0)),
        screening: json({
          minAge: Math.floor(Number(screen.minAge)) || 18,
          maxAge: Math.floor(Number(screen.maxAge)) || 120,
          countries: Array.isArray(screen.countries) ? screen.countries.map((x) => str(x, 60)) : [],
          occupations: Array.isArray(screen.occupations) ? screen.occupations.map((x) => str(x, 60)) : [],
        }),
        attentionCheck: s.attention === true,
        libraryHeadline: library ? str(library.headline, 300) || null : null,
        libraryPublishedAt: library ? date(library.publishedAt) : null,
        aiReport: convertReport(s.aiReport),
        launchedAt,
        createdAt,
      },
    });
    // Phase 1 had no versions: the survey becomes version 1, published if it ever went live, and holds the
    // Phase 1 answers. Phase 1 showed no consent statement, so none is recorded for version 1.
    // Questions go in before publishing, because published versions can't be changed.
    const questionData = () =>
      questions.map((q, position) => {
        const n = normaliseQuestion(q);
        return {
          legacyId: str(q.id, 120) || null,
          position,
          type: n.type,
          text: n.text,
          options: n.options,
          scale: n.scale ? json(n.scale) : Prisma.JsonNull,
          required: n.required,
        };
      });
    const version = await tx.surveyVersion.create({
      data: {
        surveyId: survey.id,
        number: 1,
        title: str(s.title, 200),
        description: str(s.description, 2000),
        consentText: "",
        createdAt,
        questions: { create: questionData() },
      },
      include: { questions: true },
    });
    if (status !== "DRAFT") {
      await tx.surveyVersion.update({ where: { id: version.id }, data: { publishedAt: launchedAt } });
      // Phase 2 asks every participant to agree to a consent statement. Version 2 has the same questions
      // with the standard statement, so anyone answering after the move is asked for consent; answers to
      // identical questions are analysed together across versions.
      const v2 = await tx.surveyVersion.create({
        data: {
          surveyId: survey.id,
          number: 2,
          title: str(s.title, 200),
          description: str(s.description, 2000),
          consentText: DEFAULT_CONSENT,
          questions: { create: questionData() },
        },
      });
      await tx.surveyVersion.update({ where: { id: v2.id }, data: { publishedAt: new Date() } });
      consentAdded++;
    } else await tx.surveyVersion.update({ where: { id: version.id }, data: { consentText: DEFAULT_CONSENT } });
    map.set(legacyId, {
      surveyId: survey.id,
      versionId: status === "DRAFT" ? null : version.id,
      questions: new Map(version.questions.filter((q) => q.legacyId).map((q) => [q.legacyId!, q.id])),
    });
    count("surveys", "imported");
  }
  if (consentAdded)
    report.warnings.push(
      `${consentAdded} published surveys were given a version 2 with the same questions and the standard consent statement, so participants from now on are asked for consent. Version 1 holds the Phase 1 answers, which were given without a recorded consent statement. Owners can change the statement in the builder.`,
    );
  return map;
}

const RESPONSE_STATUS = { approved: "APPROVED", flagged: "FLAGGED", rejected: "REJECTED" } as const;
const isAnswer = (v: unknown) =>
  (typeof v === "string" && v.trim() !== "") ||
  (typeof v === "number" && Number.isFinite(v)) ||
  (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string"));

async function importResponses(
  tx: Tx,
  store: Obj,
  users: Map<string, string>,
  surveys: Map<string, SurveyRef>,
  count: Count,
  skip: Skip,
  report: ImportReport,
) {
  let changedQuestions = 0;
  for (const r of objs(store.responses)) {
    count("responses", "found");
    const legacyId = str(r.id, 200);
    if (!legacyId) {
      skip("responses", r.id, "no id");
      continue;
    }
    if (await tx.response.findUnique({ where: { legacyId }, select: { id: true } })) {
      count("responses", "alreadyThere");
      continue;
    }
    const ref = surveys.get(str(r.studyId, 120));
    const participantId = users.get(str(r.participantId, 120));
    const status = RESPONSE_STATUS[String(r.status) as keyof typeof RESPONSE_STATUS];
    if (!ref) {
      skip("responses", legacyId, "its survey wasn't imported");
      continue;
    }
    if (!ref.versionId) {
      skip("responses", legacyId, "its survey was never published");
      continue;
    }
    if (!participantId) {
      skip("responses", legacyId, "the participant's account wasn't imported");
      continue;
    }
    if (!status) {
      skip("responses", legacyId, "unknown status");
      continue;
    }
    if (
      await tx.response.findUnique({
        where: { surveyId_participantId: { surveyId: ref.surveyId, participantId } },
        select: { id: true },
      })
    ) {
      skip("responses", legacyId, "this person already has a response to this survey");
      continue;
    }
    const answers = Object.entries(isObj(r.answers) ? r.answers : {}).filter(([qid, v]) => {
      if (qid === "attn" || !isAnswer(v)) return false; // the attention check is kept as passedAttention
      if (ref.questions.has(qid)) return true;
      changedQuestions++; // the question was deleted from the survey after this person answered
      return false;
    });
    const d = isObj(r.demographics) ? r.demographics : null;
    const duration = Number(r.durationSec ?? r.durationSeconds);
    await tx.response.create({
      data: {
        legacyId,
        surveyId: ref.surveyId,
        surveyVersionId: ref.versionId,
        participantId,
        status,
        isTest: r.test === true,
        rewardMinor: minor(r.reward),
        passedAttention: typeof r.passedAttention === "boolean" ? r.passedAttention : null,
        speeder: r.speeder === true,
        durationSeconds: Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null,
        demographics: d
          ? json({
              age: Number(d.age) || undefined,
              gender: str(d.gender, 40) || undefined,
              country: str(d.country, 60) || undefined,
              occupation: str(d.occupation, 60) || undefined,
            })
          : Prisma.JsonNull,
        submittedAt: date(r.createdAt, new Date())!,
        answers: {
          create: answers.map(([qid, value]) => ({ questionId: ref.questions.get(qid)!, value: json(value) })),
        },
      },
    });
    count("responses", "imported");
    count("answers", "found", answers.length);
    count("answers", "imported", answers.length);
  }
  if (changedQuestions)
    report.warnings.push(
      `${changedQuestions} answers were to questions later deleted from their survey (Phase 1 allowed editing a live survey). They were left out because the question no longer exists.`,
    );
}

async function importActions(
  tx: Tx,
  store: Obj,
  users: Map<string, string>,
  surveys: Map<string, SurveyRef>,
  count: Count,
  skip: Skip,
) {
  for (const a of objs(store.actions)) {
    count("actions", "found");
    const legacyId = str(a.id, 120);
    if (!legacyId) {
      skip("actions", a.id, "no id");
      continue;
    }
    if (await tx.insightAction.findUnique({ where: { legacyId }, select: { id: true } })) {
      count("actions", "alreadyThere");
      continue;
    }
    const ref = surveys.get(str(a.studyId, 120));
    const ownerId = users.get(str(a.ownerId, 120));
    if (!ref || !ownerId || !str(a.title, 300)) {
      skip(
        "actions",
        legacyId,
        !ref ? "its survey wasn't imported" : !ownerId ? "its owner wasn't imported" : "no title",
      );
      continue;
    }
    const createdAt = date(a.createdAt, new Date())!;
    await tx.insightAction.create({
      data: {
        legacyId,
        surveyId: ref.surveyId,
        ownerId,
        title: str(a.title, 300),
        why: str(a.why, 600),
        questionId: ref.questions.get(str(a.metricQ, 120)) ?? null,
        priority: ["high", "medium", "low"].includes(String(a.priority)) ? String(a.priority) : "medium",
        status: ["planned", "doing", "done"].includes(String(a.status)) ? String(a.status) : "planned",
        assignee: str(a.assignee, 80),
        dueOn: day(a.due),
        kpi: json({ baseline: a.baseline ?? null, target: a.target ?? null, followId: str(a.followId, 120) }),
        createdAt,
        updatedAt: date(a.updatedAt, createdAt)!,
      },
    });
    count("actions", "imported");
  }
}

// ---------- enquiries, fieldwork and settings ----------

const ENQUIRY_TYPES = ["analytics", "consultancy", "training", "contact"];
const ENQUIRY_STATUS = ["new", "contacted", "in_progress", "won", "closed"];

async function importEnquiries(tx: Tx, store: Obj, users: Map<string, string>, count: Count, skip: Skip) {
  for (const q of objs(store.enquiries)) {
    count("enquiries", "found");
    const legacyId = str(q.id, 120);
    const c = isObj(q.contact) ? q.contact : {};
    const d = isObj(q.details) ? q.details : {};
    if (!legacyId) {
      skip("enquiries", q.id, "no id");
      continue;
    }
    if (await tx.enquiry.findUnique({ where: { legacyId }, select: { id: true } })) {
      count("enquiries", "alreadyThere");
      continue;
    }
    if (!ENQUIRY_TYPES.includes(String(q.type)) || !str(c.email, 160) || !str(q.message, 4000)) {
      skip("enquiries", legacyId, "missing type, email or message");
      continue;
    }
    const createdAt = date(q.createdAt, new Date())!;
    await tx.enquiry.create({
      data: {
        legacyId,
        type: String(q.type).toUpperCase() as "CONTACT",
        status: ENQUIRY_STATUS.includes(String(q.status)) ? (String(q.status).toUpperCase() as "NEW") : "NEW",
        requesterId: users.get(str(q.requesterId, 120)) ?? null,
        name: str(c.name, 80),
        email: str(c.email, 160).toLowerCase(),
        phone: str(c.phone, 40),
        organisation: str(c.organisation, 120),
        subject: str(q.subject, 160),
        message: str(q.message, 4000),
        service: str(d.service, 120),
        timeline: str(d.timeline, 80),
        budget: str(d.budget, 80),
        createdAt,
        updatedAt: createdAt,
      },
    });
    count("enquiries", "imported");
  }
}

const FIELDWORK_STATUS = ["new", "contacted", "quoted", "won", "lost"];

async function importFieldwork(tx: Tx, store: Obj, users: Map<string, string>, count: Count, skip: Skip) {
  for (const f of objs(store.fieldwork)) {
    count("fieldwork", "found");
    const legacyId = str(f.id, 120);
    const c = isObj(f.contact) ? f.contact : {};
    if (!legacyId) {
      skip("fieldwork", f.id, "no id");
      continue;
    }
    if (await tx.fieldworkRequest.findUnique({ where: { legacyId }, select: { id: true } })) {
      count("fieldwork", "alreadyThere");
      continue;
    }
    if (!isObj(f.quote) || !isObj(f.inputs) || !str(c.email, 160)) {
      skip("fieldwork", legacyId, "missing quote, project details or email");
      continue;
    }
    let ref = str(f.ref, 20) || `Q-${legacyId.slice(-6).toUpperCase()}`;
    if (await tx.fieldworkRequest.findUnique({ where: { ref }, select: { id: true } })) ref = `${ref}-P1`;
    if (await tx.fieldworkRequest.findUnique({ where: { ref }, select: { id: true } })) {
      skip("fieldwork", legacyId, "its quote reference is already used");
      continue;
    }
    const createdAt = date(f.createdAt, new Date())!;
    await tx.fieldworkRequest.create({
      data: {
        legacyId,
        ref,
        status: FIELDWORK_STATUS.includes(String(f.status)) ? (String(f.status).toUpperCase() as "NEW") : "NEW",
        requesterId: users.get(str(f.requesterId, 120)) ?? null,
        name: str(c.name, 80),
        email: str(c.email, 160).toLowerCase(),
        phone: str(c.phone, 40),
        organisation: str(c.org ?? c.organisation, 120),
        preferredStart: str(c.start, 10),
        notes: str(c.notes, 1200),
        inputs: json(f.inputs),
        // Kept exactly as quoted at the time (Phase 1 prices), not recalculated.
        quote: json(f.quote),
        quoteTotalUsd: Math.max(0, Math.round(Number(f.quote.total) || 0)),
        surveySnapshot: isObj(f.survey) ? json(f.survey) : Prisma.JsonNull,
        createdAt,
        updatedAt: createdAt,
      },
    });
    count("fieldwork", "imported");
  }
}

async function importSettings(tx: Tx, store: Obj, count: Count) {
  const s = isObj(store.settings) ? store.settings : null;
  if (!s || !["email", "phone", "whatsapp", "address", "hours", "linkedin"].some((k) => str(s[k], 400))) return;
  count("settings", "found");
  if (await tx.siteSetting.findUnique({ where: { key: "contact" }, select: { key: true } })) {
    count("settings", "alreadyThere"); // set on the new site already: that wins
    return;
  }
  const web = str(s.linkedin, 300);
  await tx.siteSetting.create({
    data: {
      key: "contact",
      value: json({
        email: str(s.email, 160),
        phone: str(s.phone, 40),
        whatsapp: str(s.whatsapp, 40),
        address: str(s.address, 400),
        hours: str(s.hours, 160),
        linkedin: /^https:\/\/\S+$/.test(web) ? web : "",
      }),
    },
  });
  count("settings", "imported");
}

/** The report as text for the terminal. Only ids and counts, never personal details. */
export function formatReport(r: ImportReport): string {
  const L = [
    r.mode === "dry-run"
      ? "DRY RUN: nothing was saved. Run again with --apply to import."
      : "APPLIED: the import was saved.",
    "",
    `${"".padEnd(16)}${["found", "imported", "already", "linked", "skipped"].map((h) => h.padStart(10)).join("")}`,
  ];
  for (const e of ENTITIES) {
    const c = r.counts[e];
    L.push(
      `${e.padEnd(16)}${[c.found, c.imported, c.alreadyThere, c.linked, c.skipped].map((n) => String(n).padStart(10)).join("")}`,
    );
  }
  if (r.skipped.length) {
    L.push("", "Skipped:");
    for (const s of r.skipped) L.push(`- ${s.entity} ${s.legacyId}: ${s.reason}`);
  }
  if (r.warnings.length) {
    L.push("", "Warnings:");
    for (const w of r.warnings) L.push(`- ${w}`);
  }
  return L.join("\n");
}
