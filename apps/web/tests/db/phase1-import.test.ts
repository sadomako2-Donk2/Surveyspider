import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, uniq } from "./helpers";
import { formatReport, importPhase1 } from "../../scripts/phase1/import-lib";
import { verifyPassword } from "@/server/auth/password";
import { loadAnalysis } from "@/server/surveys/analysis";
import * as S from "@/server/surveys/handlers";
import { signedIn } from "./accounts";
import { DEFAULT_CONSENT } from "@/lib/surveys";

// tests/fixtures/phase1-store.json was written by the real Phase 1 server (scripts/phase1/make-fixture.mjs).
const raw = readFileSync(path.join(import.meta.dirname, "..", "fixtures", "phase1-store.json"), "utf8");
const ID = /\b(u_[0-9a-f]{24}|s_live1|s_draft1|s_closed1|c_stats|c_draft|e_[12]|q_[12]|f_1|a_1|Q-AB12CD)\b/g;

/** A copy of the fixture with every id and email made unique, so each test imports its own data. */
function store(tag = uniq("t").replace(/-/g, "")) {
  const s = raw.replace(ID, `$1_${tag}`).replace(/@example\.(com|org)"/gi, (_m, d) => `.${tag}@example.${d}"`);
  return { tag, data: JSON.parse(s) as Record<string, Record<string, Record<string, unknown>>> };
}
const run = (data: unknown, apply = true) => importPhase1(db, data, { apply });
const userByEmail = (local: string, tag: string) =>
  db.user.findUniqueOrThrow({ where: { email: `${local}.${tag}@example.com`.toLowerCase() } });

beforeEach(() => db.siteSetting.deleteMany({ where: { key: "contact" } }));
afterAll(() => db.$disconnect());

describe("Phase 1 import", () => {
  it("a dry run reports what would happen and saves nothing", async () => {
    const { tag, data } = store();
    const r = await run(data, false);
    expect(r.mode).toBe("dry-run");
    expect(r.counts.users).toMatchObject({ found: 6, imported: 6, skipped: 0 });
    expect(r.counts.responses).toMatchObject({ found: 5, imported: 5 });
    expect(r.counts.surveys.imported).toBe(3);
    expect(await db.user.count({ where: { email: { contains: tag.toLowerCase() } } })).toBe(0);
    expect(await db.siteSetting.findUnique({ where: { key: "contact" } })).toBeNull();
    expect(formatReport(r)).toMatch(/^DRY RUN: nothing was saved/);
  });

  it("imports accounts, surveys, responses, Academy, enquiries, Paper Survey requests and settings", async () => {
    const { tag, data } = store();
    const r = await run(data);
    expect(r.mode).toBe("applied");
    expect(r.skipped).toEqual([]);
    expect(r.warnings).toEqual([
      "2 published surveys were given a version 2 with the same questions and the standard consent statement, so participants from now on are asked for consent. Version 1 holds the Phase 1 answers, which were given without a recorded consent statement. Owners can change the statement in the builder.",
      "2 answers were to questions later deleted from their survey (Phase 1 allowed editing a live survey). They were left out because the question no longer exists.",
    ]);

    // Accounts keep their Phase 1 passwords; sessions are not copied.
    const owner = await userByEmail("owner", tag);
    expect(await verifyPassword("phase one password", owner.passwordHash)).toBe(true);
    expect(await verifyPassword("wrong password", owner.passwordHash)).toBe(false);
    expect(owner).toMatchObject({ name: "Abena Owner", legacyId: expect.stringMatching(/^u_/) });
    expect(owner.emailVerifiedAt).not.toBeNull();
    expect(await db.session.count({ where: { userId: owner.id } })).toBe(0);
    const p1 = await userByEmail("participant1", tag);
    expect(await db.participantProfile.findUnique({ where: { userId: p1.id } })).toMatchObject({
      age: 34,
      country: "Ghana",
    });

    // The live survey becomes published version 1 with its current questions.
    const live = await db.survey.findUniqueOrThrow({
      where: { legacyId: `s_live1_${tag}` },
      include: { versions: { orderBy: { number: "asc" }, include: { questions: { orderBy: { position: "asc" } } } } },
    });
    expect(live).toMatchObject({
      ownerId: owner.id,
      status: "LIVE",
      rewardMinor: 125,
      targetResponses: 100,
      estimatedMinutes: 5,
      attentionCheck: true,
      libraryHeadline: "Most people found the course useful",
    });
    expect(live.aiReport).toMatchObject({ headline: "Usefulness is high", responses: 3 });
    expect(live.versions).toHaveLength(2);
    const [v, v2] = live.versions as [(typeof live.versions)[0], (typeof live.versions)[0]];
    expect(v.publishedAt).not.toBeNull();
    expect(v.consentText).toBe(""); // Phase 1 recorded no consent statement; none is made up
    expect(v2.consentText).toBe(DEFAULT_CONSENT); // asked of everyone who answers from now on
    expect(v2.publishedAt).not.toBeNull();
    expect(v2.questions.map((q) => q.text)).toEqual(v.questions.map((q) => q.text));
    expect(await db.response.count({ where: { surveyVersionId: v2.id } })).toBe(0);
    expect(v.questions.map((q) => q.type)).toEqual(["LIKERT", "RATING", "SINGLE", "MULTI", "NUMBER", "TEXT"]);
    expect(v.questions[1]!.scale).toEqual({ min: 0, max: 10, minLabel: "Not likely", maxLabel: "Very likely" });

    // Responses: the owner's test answer and the rejected one are kept but left out of analysis, as before.
    const responses = await db.response.findMany({ where: { surveyId: live.id }, include: { answers: true } });
    expect(responses).toHaveLength(5);
    expect(responses.filter((x) => x.isTest).map((x) => x.participantId)).toEqual([owner.id]);
    expect(responses.filter((x) => x.status === "REJECTED")).toHaveLength(1);
    const a = (await loadAnalysis(db, owner.id, live.id))!;
    expect(a.rows).toHaveLength(3);
    const byText = (t: string) => a.questions.find((q) => q.text.startsWith(t))!.id;
    expect(a.rows.map((x) => x.answers[byText("What did you like")])).toEqual([
      ["Trainer", "Materials"],
      ["Trainer"],
      undefined,
    ]);
    expect(a.rows.map((x) => x.answers[byText("How likely")])).toEqual([10, 9, 8]);
    expect(a.rows[0]).toMatchObject({
      durationSeconds: 200,
      passedAttention: true,
      demographics: { country: "Ghana" },
    });
    expect(await loadAnalysis(db, p1.id, live.id)).toBeNull(); // still owner-only

    const draft = await db.survey.findUniqueOrThrow({
      where: { legacyId: `s_draft1_${tag}` },
      include: { versions: true },
    });
    expect([draft.status, draft.versions.length, draft.versions[0]!.publishedAt]).toEqual(["DRAFT", 1, null]);
    expect(draft.versions[0]!.consentText).toBe(DEFAULT_CONSENT); // a draft: the owner can still edit it
    expect(draft.screening).toMatchObject({ countries: ["Ghana"] });
    expect((await db.survey.findUniqueOrThrow({ where: { legacyId: `s_closed1_${tag}` } })).status).toBe("CLOSED");
    const action = await db.insightAction.findUniqueOrThrow({ where: { legacyId: `a_1_${tag}` } });
    expect(action).toMatchObject({
      title: "Add more worked examples",
      priority: "high",
      questionId: v.questions[0]!.id,
    });
    expect(action.dueOn?.toISOString()).toBe("2026-12-15T00:00:00.000Z");

    // Academy
    const course = await db.course.findUniqueOrThrow({
      where: { legacyId: `c_stats_${tag}` },
      include: { sessions: true, enrollments: { orderBy: { createdAt: "asc" } } },
    });
    expect(course).toMatchObject({ status: "PUBLISHED", slug: expect.stringMatching(/^applied-statistics-with-r/) });
    expect(course.sessions[0]).toMatchObject({ feeMinor: 45000, currency: "GHS", seats: 20, location: "Accra" });
    expect(course.sessions[0]!.startsOn?.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(course.enrollments.map((e) => [e.status, e.sessionId])).toEqual([
      ["CONFIRMED", course.sessions[0]!.id],
      ["INTEREST", null],
    ]);
    expect((await db.course.findUniqueOrThrow({ where: { legacyId: `c_draft_${tag}` } })).status).toBe("DRAFT");

    // Enquiries, Paper Survey request, contact settings
    const visitor = await db.enquiry.findUniqueOrThrow({ where: { legacyId: `q_1_${tag}` } });
    expect(visitor).toMatchObject({
      type: "ANALYTICS",
      status: "NEW",
      requesterId: null,
      service: "Statistical analysis",
    });
    expect(visitor.email).toBe(`visitor.${tag}@example.org`.toLowerCase());
    const p2 = await userByEmail("participant2", tag);
    expect(await db.enquiry.findUniqueOrThrow({ where: { legacyId: `q_2_${tag}` } })).toMatchObject({
      type: "CONSULTANCY",
      status: "IN_PROGRESS",
      requesterId: p2.id,
    });
    expect(await db.fieldworkRequest.findUniqueOrThrow({ where: { legacyId: `f_1_${tag}` } })).toMatchObject({
      ref: `Q-AB12CD_${tag}`,
      status: "QUOTED",
      quoteTotalUsd: 5321,
      organisation: "Example Clinic",
      preferredStart: "2027-01-10",
    });
    expect((await db.siteSetting.findUniqueOrThrow({ where: { key: "contact" } })).value).toMatchObject({
      address: "Accra, Ghana",
      linkedin: "https://www.linkedin.com/company/example",
    });
  });

  it("can be run again without importing anything twice", async () => {
    const { data } = store();
    await run(data);
    const again = await run(data);
    for (const [entity, c] of Object.entries(again.counts))
      expect([entity, c.imported, c.skipped]).toEqual([entity, 0, 0]);
    expect(again.counts.users.alreadyThere).toBe(6);
    expect(again.counts.responses.alreadyThere).toBe(5);
    expect(again.counts.settings.alreadyThere).toBe(1);
  });

  it("links an account that already signed up on the new site, keeping its new password", async () => {
    const { tag, data } = store();
    const email = `owner.${tag}@example.com`.toLowerCase();
    const existing = await db.user.create({ data: { email, passwordHash: "scrypt$new", name: "" } });
    const r = await run(data);
    expect(r.counts.users).toMatchObject({ imported: 5, linked: 1 });
    const u = await db.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(u).toMatchObject({
      passwordHash: "scrypt$new",
      name: "Abena Owner",
      legacyId: expect.stringMatching(/^u_/),
    });
    expect(await db.survey.count({ where: { ownerId: existing.id } })).toBe(3);
  });

  it("skips what can't be carried across, with the reason, and never puts personal details in the report", async () => {
    const { tag, data } = store();
    const users = data.users!;
    const [ownerId] = Object.entries(users).find(([, u]) => String(u.email).startsWith("owner"))!;
    const p4 = Object.entries(users).find(([, u]) => String(u.email).startsWith("participant4"))!;
    delete users[p4[0]]; // participant 4's account is missing
    const p3 = Object.values(users).find((u) => String(u.email).startsWith("participant3"))!;
    p3.emailVerified = false; // never confirmed their address
    data.studies![`s_anon_${tag}`] = {
      ...data.studies![`s_closed1_${tag}`]!,
      id: `s_anon_${tag}`,
      ownerId: "c_visitor",
    };
    data.profiles![ownerId] = { age: 16, gender: "", country: "", occupation: "" };
    data.enrollments![`e_dup_${tag}`] = { ...data.enrollments![`e_1_${tag}`]!, id: `e_dup_${tag}` };

    const r = await run(data);
    expect(r.skipped).toEqual(
      expect.arrayContaining([
        {
          entity: "surveys",
          legacyId: `s_anon_${tag}`,
          reason: expect.stringMatching(/owner's account wasn't imported/),
        },
        {
          entity: "responses",
          legacyId: expect.stringContaining(p4[0]),
          reason: "the participant's account wasn't imported",
        },
        { entity: "profiles", legacyId: p4[0], reason: "belongs to a visitor without an account" },
        { entity: "profiles", legacyId: ownerId, reason: "age missing or under 18" },
        {
          entity: "enrollments",
          legacyId: `e_dup_${tag}`,
          reason: expect.stringMatching(/already has an active registration/),
        },
      ]),
    );
    expect(r.counts.responses).toMatchObject({ found: 5, imported: 4, skipped: 1 });
    expect((await userByEmail("participant3", tag)).emailVerifiedAt).toBeNull();
    const text = JSON.stringify(r) + formatReport(r);
    expect(text).not.toMatch(/@example\.|Abena|More examples|Participant \d/);
  });

  it("keeps imported live surveys working: new participants consent and are analysed with the old answers", async () => {
    const { tag, data } = store();
    await run(data);
    const live = await db.survey.findUniqueOrThrow({
      where: { legacyId: `s_live1_${tag}` },
      include: { versions: { where: { number: 2 }, include: { questions: { orderBy: { position: "asc" } } } } },
    });
    const v2 = live.versions[0]!;
    const newcomer = await signedIn();
    await newcomer.call((req) => S.saveProfile(req, db), {
      method: "PUT",
      body: { age: 25, gender: "Man", country: "Ghana", occupation: "Student" },
    });
    const submit = (b: Awaited<ReturnType<typeof signedIn>>) =>
      b.call((req) => S.submitResponse(live.id)(req, db), {
        body: {
          versionId: v2.id,
          consent: true,
          durationSeconds: 200,
          answers: Object.fromEntries([
            [v2.questions[0]!.id, "Agree"],
            [v2.questions[1]!.id, 7],
            [v2.questions[2]!.id, "Online"],
            [v2.questions[3]!.id, ["Venue"]],
          ]),
        },
      });
    const r = await submit(newcomer);
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(await db.consentRecord.findFirst({ where: { participantId: newcomer.user.id } })).toMatchObject({
      statement: DEFAULT_CONSENT,
    });
    const owner = await userByEmail("owner", tag);
    const a = (await loadAnalysis(db, owner.id, live.id))!;
    expect(a.rows.map((x) => x.version)).toEqual([1, 1, 1, 2]);
    expect(a.rows.map((x) => x.answers[a.questions[1]!.id])).toEqual([10, 9, 8, 7]);
  });

  it("rejects a file that isn't a Phase 1 store", async () => {
    await expect(run([1, 2, 3])).rejects.toThrow(/isn't a Phase 1 store/);
  });
});
