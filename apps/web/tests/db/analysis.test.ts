import { afterAll, describe, expect, it } from "vitest";
import { db } from "./helpers";
import { signedIn } from "./accounts";
import * as S from "@/server/surveys/handlers";
import { GET as analysisRoute } from "@/app/api/surveys/[id]/analysis/route";
import { adminSurveyTotals, loadAnalysis } from "@/server/surveys/analysis";
import { LIKERT_SETS } from "@/lib/surveys";

afterAll(() => db.$disconnect());
type B = Awaited<ReturnType<typeof signedIn>>;
const call = (
  b: B,
  f: (id: string) => (req: Request, d: typeof db) => Promise<Response>,
  id: string,
  body?: unknown,
  method = "POST",
) => b.call((req) => f(id)(req, db), body === undefined ? {} : { method, body });

const base = {
  title: "Analysis survey",
  reward: "0",
  target: 50,
  minutes: 5,
  attentionCheck: false,
  questions: [
    { type: "LIKERT", text: "The course was useful.", options: LIKERT_SETS.agree5!.options },
    {
      type: "RATING",
      text: "How likely are you to recommend it?",
      scale: { min: 0, max: 10, minLabel: "No", maxLabel: "Yes" },
    },
  ],
};

async function setup() {
  const owner = await signedIn();
  const c = await owner.call((req) => S.createSurvey(req, db), { body: base });
  const id = c.json!.id as string;
  await call(owner, S.publishSurvey, id, {});
  const v1 = await db.surveyVersion.findFirstOrThrow({
    where: { surveyId: id },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  const answer = async (p: B, versionId: string, answers: Record<string, unknown>) =>
    p.call((req) => S.submitResponse(id)(req, db), {
      body: { versionId, consent: true, durationSeconds: 200, answers },
    });
  return { owner, id, v1, answer };
}

describe("analysis data", () => {
  it("is available to the survey's owner only, never to administrators", async () => {
    const { owner, id, v1, answer } = await setup();
    const p = await signedIn();
    await answer(p, v1.id, { [v1.questions[0]!.id]: "Agree", [v1.questions[1]!.id]: 9 });
    expect((await loadAnalysis(db, owner.user.id, id))!.rows).toHaveLength(1);
    const admin = await signedIn({ siteAdmin: true });
    expect(await loadAnalysis(db, admin.user.id, id)).toBeNull();
    expect(await loadAnalysis(db, p.user.id, id)).toBeNull();
    const route = (b: B) => b.call((req) => analysisRoute(req, { params: Promise.resolve({ id }) }));
    expect((await route(admin)).status).toBe(404);
    const mine = await route(owner);
    expect(mine.json!.questions[1].summary).toMatchObject({ kind: "numeric", n: 1, nps: { nps: 100 } });
  });

  it("gives administrators counts only, with no answers or participant details", async () => {
    const { id, v1, answer } = await setup();
    const p = await signedIn({ email: `secret-person-${Date.now()}@example.com` });
    await answer(p, v1.id, { [v1.questions[0]!.id]: "Strongly agree", [v1.questions[1]!.id]: 10 });
    const totals = await adminSurveyTotals(db);
    const mine = totals.find((t) => t.id === id)!;
    expect(mine).toMatchObject({ title: "Analysis survey", responses: 1, status: "LIVE" });
    const text = JSON.stringify(totals);
    expect(text).not.toContain("Strongly agree");
    expect(text).not.toContain(p.user.email);
    expect(text).not.toContain(p.user.id);
  });

  it("leaves out test and rejected responses, uses P-codes, and counts unchanged questions across versions", async () => {
    const { owner, id, v1, answer } = await setup();
    await answer(owner, v1.id, { [v1.questions[0]!.id]: "Agree", [v1.questions[1]!.id]: 0 }); // owner's test
    const a = await answer(await signedIn(), v1.id, { [v1.questions[0]!.id]: "Agree", [v1.questions[1]!.id]: 8 });
    const b = await answer(await signedIn(), v1.id, { [v1.questions[0]!.id]: "Disagree", [v1.questions[1]!.id]: 2 });
    await owner.call((req) => S.reviewResponse(b.json!.id)(req, db), { method: "PATCH", body: { status: "REJECTED" } });
    // Version 2 keeps question 1 as it was and rewords question 2.
    const v2body = {
      ...base,
      questions: [
        base.questions[0],
        { ...base.questions[1], text: "How likely are you to recommend this course to a colleague?" },
      ],
    };
    await call(owner, S.saveSurvey, id, v2body, "PUT");
    await call(owner, S.publishSurvey, id, {});
    const v2 = await db.surveyVersion.findFirstOrThrow({
      where: { surveyId: id, number: 2 },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    await answer(await signedIn(), v2.id, { [v2.questions[0]!.id]: "Strongly agree", [v2.questions[1]!.id]: 10 });

    const data = (await loadAnalysis(db, owner.user.id, id))!;
    expect(data.questions.map((q) => q.id)).toEqual(v2.questions.map((q) => q.id));
    expect(data.rows.map((r) => [r.code, r.version])).toEqual([
      ["P002", 1],
      ["P004", 2],
    ]); // P001 = test, P003 = rejected
    expect(data.totals).toEqual({ all: 3, flagged: 0, rejected: 1 });
    const [useful, recommend] = data.questions;
    expect(data.rows.map((r) => r.answers[useful!.id])).toEqual(["Agree", "Strongly agree"]); // same question in both versions
    expect(data.rows.map((r) => r.answers[recommend!.id])).toEqual([undefined, 10]); // reworded: only version 2 counts
    expect(JSON.stringify(data.rows)).not.toMatch(/participantId|@example\.com/);
  });
});
