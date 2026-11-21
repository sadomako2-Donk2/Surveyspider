import { afterAll, describe, expect, it } from "vitest";
import { db } from "./helpers";
import { browser } from "./fakes";
import { signedIn } from "./accounts";
import * as S from "@/server/surveys/handlers";
import { ATTENTION, DEFAULT_CONSENT, LIKERT_SETS } from "@/lib/surveys";

afterAll(() => db.$disconnect());

type B = Awaited<ReturnType<typeof signedIn>>;
const bind = (f: (req: Request, d: typeof db) => Promise<Response>) => (req: Request) => f(req, db);
const byId = (f: (id: string) => (req: Request, d: typeof db) => Promise<Response>) => (id: string) => (req: Request) =>
  f(id)(req, db);
const create = bind(S.createSurvey),
  mineList = bind(S.listMySurveys),
  panel = bind(S.openSurveys),
  saveProfile = bind(S.saveProfile);
const get = byId(S.getMySurvey),
  save = byId(S.saveSurvey),
  publish = byId(S.publishSurvey),
  setStatus = byId(S.setSurveyStatus),
  del = byId(S.deleteSurvey);
const submit = byId(S.submitResponse),
  responses = byId(S.listResponses),
  review = byId(S.reviewResponse);

const survey = (over: Record<string, unknown> = {}) => ({
  title: "Course evaluation",
  description: "Tell us how it went.",
  reward: "1.00",
  target: 3,
  minutes: 5,
  attentionCheck: false,
  questions: [
    { type: "LIKERT", text: "The course was useful.", options: LIKERT_SETS.agree5!.options },
    {
      type: "RATING",
      text: "How likely are you to recommend it?",
      scale: { min: 0, max: 10, minLabel: "Not at all likely", maxLabel: "Extremely likely" },
    },
    { type: "MULTI", text: "What did you use?", options: ["Slides", "Exercises", "Videos"] },
    { type: "TEXT", text: "Any comments?", required: false },
  ],
  ...over,
});

async function liveSurvey(owner: B, over: Record<string, unknown> = {}) {
  const c = await owner.call(create, { body: survey(over) });
  expect(c.status).toBe(200);
  expect((await owner.call(publish(c.json!.id), { body: {} })).status).toBe(200);
  const s = (await owner.call(get(c.json!.id))).json!.survey;
  const v = await db.surveyVersion.findFirstOrThrow({
    where: { surveyId: c.json!.id, publishedAt: { not: null } },
    orderBy: { number: "desc" },
  });
  return { id: c.json!.id as string, versionId: v.id, q: s.questions.map((x: { id: string }) => x.id) as string[] };
}
const goodAnswers = (q: string[]) => ({ [q[0]!]: "Agree", [q[1]!]: 9, [q[2]!]: ["Slides", "Exercises"] });
const answer = (p: B, s: { id: string; versionId: string; q: string[] }, over: Record<string, unknown> = {}) =>
  p.call(submit(s.id), {
    body: { versionId: s.versionId, consent: true, durationSeconds: 240, answers: goodAnswers(s.q), ...over },
  });

describe("building surveys", () => {
  it("needs an account; unconfirmed people can save drafts but not launch", async () => {
    expect((await browser("10.50.0.1").call(create, { body: survey() })).status).toBe(401);
    const u = await signedIn({ verified: false });
    process.env.RESEND_API_KEY = "test-resend-key"; // verification only applies when email is switched on
    const c = await u.call(create, { body: survey() });
    expect(c.status).toBe(200);
    expect((await u.call(publish(c.json!.id), { body: {} })).json!.code).toBe("verify_required");
  });

  it("stores questions with the default consent statement and lists my surveys", async () => {
    const owner = await signedIn();
    const c = await owner.call(create, { body: survey() });
    const s = (await owner.call(get(c.json!.id))).json!.survey;
    expect(s).toMatchObject({
      status: "DRAFT",
      title: "Course evaluation",
      consentText: DEFAULT_CONSENT,
      reward: "1.00",
      target: 3,
      version: { number: 1, published: false, liveNumber: null },
    });
    expect(s.questions.map((q: { type: string }) => q.type)).toEqual(["LIKERT", "RATING", "MULTI", "TEXT"]);
    expect(s.questions[1].scale).toEqual({
      min: 0,
      max: 10,
      minLabel: "Not at all likely",
      maxLabel: "Extremely likely",
    });
    expect((await owner.call(mineList)).json!.surveys.map((x: { id: string }) => x.id)).toContain(c.json!.id);
  });

  it("keeps surveys private to their owner", async () => {
    const owner = await signedIn(),
      other = await signedIn(),
      admin = await signedIn({ siteAdmin: true });
    const c = await owner.call(create, { body: survey() });
    for (const who of [other, admin]) {
      expect((await who.call(get(c.json!.id))).status).toBe(404);
      expect((await who.call(save(c.json!.id), { method: "PUT", body: survey({ title: "Hijacked" }) })).status).toBe(
        404,
      );
      expect((await who.call(del(c.json!.id), { method: "DELETE" })).status).toBe(404);
    }
  });

  it("checks settings and refuses to publish an incomplete survey", async () => {
    const owner = await signedIn();
    expect((await owner.call(create, { body: survey({ reward: "-1" }) })).json!.message).toMatch(/reward/);
    expect((await owner.call(create, { body: survey({ target: 0 }) })).json!.message).toMatch(/responses wanted/);
    expect(
      (await owner.call(create, { body: survey({ screening: { countries: ["Atlantis"] } }) })).json!.message,
    ).toMatch(/countries/);
    const c = await owner.call(create, {
      body: survey({
        title: "",
        consentText: "",
        questions: [{ type: "SINGLE", text: "Pick", options: ["Only one"] }],
      }),
    });
    expect((await owner.call(publish(c.json!.id), { body: {} })).json!.message).toBe(
      "Give the survey a title. Add a consent statement for participants. Question 1 needs at least two answer options.",
    );
  });

  it("freezes the published version and puts edits into the next version", async () => {
    const owner = await signedIn();
    const s = await liveSurvey(owner);
    const edited = survey({ questions: [...survey().questions, { type: "NUMBER", text: "Hours of study?" }] });
    const r = await owner.call(save(s.id), { method: "PUT", body: edited });
    expect(r.json!.survey.version).toEqual({ number: 2, published: false, liveNumber: 1 });
    // Version 1 is untouched and still the one people answer
    expect(await db.question.count({ where: { versionId: s.versionId } })).toBe(4);
    expect((await answer(await signedIn(), s)).status).toBe(200);
    // Saving again edits draft 2 in place; publishing makes it live
    await owner.call(save(s.id), { method: "PUT", body: edited });
    expect(await db.surveyVersion.count({ where: { surveyId: s.id } })).toBe(2);
    expect((await owner.call(publish(s.id), { body: {} })).json!.version).toBe(2);
    expect((await owner.call(publish(s.id), { body: {} })).status).toBe(409); // nothing new to publish
    // Saving identical content after publishing doesn't create an empty new version
    await owner.call(save(s.id), { method: "PUT", body: edited });
    expect(await db.surveyVersion.count({ where: { surveyId: s.id } })).toBe(2);
  });

  it("locks pay and audience once people have answered, but allows a higher target", async () => {
    const owner = await signedIn();
    const s = await liveSurvey(owner);
    await answer(await signedIn(), s);
    expect((await owner.call(save(s.id), { method: "PUT", body: survey({ reward: "2.00" }) })).json!.message).toMatch(
      /reward, time, audience/,
    );
    expect((await owner.call(save(s.id), { method: "PUT", body: survey({ target: 10 }) })).status).toBe(200);
  });

  it("deletes drafts but only closes published surveys", async () => {
    const owner = await signedIn();
    const draft = await owner.call(create, { body: survey() });
    expect((await owner.call(del(draft.json!.id), { method: "DELETE" })).status).toBe(204);
    const s = await liveSurvey(owner);
    expect((await owner.call(del(s.id), { method: "DELETE" })).json!.message).toMatch(/Close it instead/);
    expect((await owner.call(setStatus(s.id), { body: { status: "CLOSED" } })).status).toBe(200);
    expect((await answer(await signedIn(), s)).status).toBe(404);
    expect((await owner.call(setStatus(s.id), { body: { status: "LIVE" } })).status).toBe(200);
  });
});

describe("taking surveys", () => {
  it("records consent with the exact wording and the answers, linked to the version", async () => {
    const owner = await signedIn();
    const s = await liveSurvey(owner, { consentText: "I agree to take part in the Legon course study." });
    const p = await signedIn();
    expect((await answer(p, s, { consent: false })).json!.message).toMatch(/consent/);
    const r = await answer(p, s, { answers: { ...goodAnswers(s.q), [s.q[3]!]: "  Great course  " } });
    expect(r.json).toMatchObject({ status: "APPROVED", test: false });
    const saved = await db.response.findUniqueOrThrow({
      where: { id: r.json!.id },
      include: { answers: true, consentRecord: true },
    });
    expect(saved).toMatchObject({ surveyVersionId: s.versionId, rewardMinor: 100, isTest: false });
    expect(saved.consentRecord!.statement).toBe("I agree to take part in the Legon course study.");
    expect(Object.fromEntries(saved.answers.map((a) => [a.questionId, a.value]))).toEqual({
      ...goodAnswers(s.q),
      [s.q[3]!]: "Great course",
    });
    expect((await answer(p, s)).json!.message).toMatch(/already taken/);
  });

  it("checks every answer on the server", async () => {
    const s = await liveSurvey(await signedIn());
    const p = await signedIn();
    expect((await answer(p, s, { answers: { [s.q[0]!]: "Agree" } })).json!.message).toBe(
      "Please answer questions 2, 3.",
    );
    expect((await answer(p, s, { answers: { ...goodAnswers(s.q), [s.q[1]!]: 11 } })).json!.message).toBe(
      "Please check your answer to question 2.",
    );
    expect((await answer(p, s, { answers: { ...goodAnswers(s.q), [s.q[2]!]: ["Podcasts"] } })).json!.message).toBe(
      "Please check your answer to question 3.",
    );
    expect((await answer(p, s, { answers: { ...goodAnswers(s.q), sneaky: "x" } })).json!.message).toMatch(
      /don't belong/,
    );
    expect((await answer(p, s, { versionId: "old" })).status).toBe(409);
  });

  it("flags failed attention checks and speeders for review", async () => {
    const s = await liveSurvey(await signedIn(), { attentionCheck: true, target: 10 });
    const ok = await answer(await signedIn(), s, { answers: { ...goodAnswers(s.q), [ATTENTION.key]: "Purple" } });
    const failed = await answer(await signedIn(), s, { answers: { ...goodAnswers(s.q), [ATTENTION.key]: "Red" } });
    const fast = await answer(await signedIn(), s, {
      durationSeconds: 30,
      answers: { ...goodAnswers(s.q), [ATTENTION.key]: "Purple" },
    });
    expect([ok.json!.status, failed.json!.status, fast.json!.status]).toEqual(["APPROVED", "FLAGGED", "FLAGGED"]);
  });

  it("stops at the target, even when people submit at the same moment, and doesn't count the owner's test", async () => {
    const owner = await signedIn();
    const s = await liveSurvey(owner, { target: 2 });
    expect((await answer(owner, s)).json!.test).toBe(true);
    const people = await Promise.all(Array.from({ length: 5 }, () => signedIn()));
    const results = await Promise.all(people.map((p) => answer(p, s)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409).every((r) => /all the responses/.test(r.json!.message))).toBe(true);
  });

  it("applies screening using the participant profile", async () => {
    const s = await liveSurvey(await signedIn(), { screening: { countries: ["Ghana"], occupations: ["Student"] } });
    const p = await signedIn();
    expect((await answer(p, s)).json!.message).toMatch(/profile/);
    expect(
      (
        await p.call(saveProfile, {
          method: "PUT",
          body: { age: 17, gender: "Woman", country: "Ghana", occupation: "Student" },
        })
      ).status,
    ).toBe(400);
    await p.call(saveProfile, {
      method: "PUT",
      body: { age: 24, gender: "Woman", country: "Kenya", occupation: "Student" },
    });
    expect((await answer(p, s)).json!.code).toBe("not_eligible");
    await p.call(saveProfile, {
      method: "PUT",
      body: { age: 24, gender: "Woman", country: "Ghana", occupation: "Student" },
    });
    const r = await answer(p, s);
    expect(r.status).toBe(200);
    expect((await db.response.findUniqueOrThrow({ where: { id: r.json!.id } })).demographics).toEqual({
      age: 24,
      gender: "Woman",
      country: "Ghana",
      occupation: "Student",
    });
  });

  it("lists only surveys a person can take now", async () => {
    const owner = await signedIn();
    const open = await liveSurvey(owner, { title: "Open to all" });
    const ghana = await liveSurvey(owner, { title: "Ghana only", screening: { countries: ["Ghana"] } });
    const p = await signedIn();
    const titles = async () => (await p.call(panel)).json!.surveys.map((x: { title: string }) => x.title);
    expect(await titles()).toContain("Open to all");
    expect(await titles()).not.toContain("Ghana only");
    await p.call(saveProfile, {
      method: "PUT",
      body: { age: 30, gender: "Man", country: "Ghana", occupation: "Retired" },
    });
    expect(await titles()).toContain("Ghana only");
    await answer(p, open);
    expect(await titles()).not.toContain("Open to all");
    expect((await owner.call(panel)).json!.surveys.map((x: { id: string }) => x.id)).not.toContain(ghana.id); // not your own
  });
});

describe("reviewing answers", () => {
  it("shows answers only to the survey's owner, never to site administrators", async () => {
    const owner = await signedIn();
    const s = await liveSurvey(owner);
    const p = await signedIn({ email: `participant-${Date.now()}@example.com` });
    await answer(p, s);
    const list = (await owner.call(responses(s.id))).json!.responses;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ participant: "P001", version: 1, status: "APPROVED" });
    expect(JSON.stringify(list)).not.toContain(p.user.id);
    expect(JSON.stringify(list)).not.toContain(p.user.email);
    const admin = await signedIn({ siteAdmin: true });
    expect((await admin.call(responses(s.id))).status).toBe(404);
    expect((await p.call(responses(s.id))).status).toBe(404);
  });

  it("lets the owner approve or reject, and rejected responses free a place", async () => {
    const owner = await signedIn();
    const s = await liveSurvey(owner, { target: 1 });
    const first = await answer(await signedIn(), s);
    expect((await answer(await signedIn(), s)).status).toBe(409);
    expect(
      (
        await (
          await signedIn({ siteAdmin: true })
        ).call(review(first.json!.id), { method: "PATCH", body: { status: "REJECTED" } })
      ).status,
    ).toBe(404);
    expect((await owner.call(review(first.json!.id), { method: "PATCH", body: { status: "PAID" } })).status).toBe(400);
    expect((await owner.call(review(first.json!.id), { method: "PATCH", body: { status: "REJECTED" } })).status).toBe(
      200,
    );
    expect((await answer(await signedIn(), s)).status).toBe(200);
  });
});
