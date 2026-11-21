import { describe, expect, it } from "vitest";
import * as A from "@/lib/analysis";
import { LIKERT_SETS, normaliseQuestion } from "@/lib/surveys";

const q = (id: string, over: Record<string, unknown>) => ({ ...normaliseQuestion(over), id }) as A.AQ;
const agree = LIKERT_SETS.agree5!.options;
const Q = {
  useful: q("useful", { type: "LIKERT", text: "The course was useful.", options: agree }),
  apply: q("apply", { type: "LIKERT", text: "I can apply what I learned.", options: agree }),
  nps: q("nps", {
    type: "RATING",
    text: "How likely are you to recommend us?",
    scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Very likely" },
  }),
  hours: q("hours", { type: "NUMBER", text: "Hours of study" }),
  mode: q("mode", { type: "SINGLE", text: "How did you attend?", options: ["In person", "Online"] }),
  used: q("used", { type: "MULTI", text: "What did you use?", options: ["Slides", "Videos"] }),
  why: q("why", { type: "TEXT", text: "Why?", required: false }),
};
const questions = Object.values(Q);

let n = 0;
const row = (
  answers: Record<string, unknown>,
  demo: Partial<NonNullable<A.ARow["demographics"]>> = {},
  extra: Partial<A.ARow> = {},
): A.ARow => ({
  id: `r${n}`,
  code: `P${String(++n).padStart(3, "0")}`,
  status: "APPROVED",
  version: 1,
  submittedAt: "2026-11-21T10:00:00Z",
  durationSeconds: 300,
  passedAttention: true,
  speeder: false,
  demographics: { age: 30, gender: "Woman", country: "Ghana", occupation: "Student", ...demo },
  answers: answers as A.ARow["answers"],
  ...extra,
});

// 10 people: Ghana scores high, Kenya low; "apply" tracks "nps" closely.
const rows: A.ARow[] = [
  ...[5, 5, 4, 5, 4, 5].map((s, i) =>
    row(
      {
        useful: agree[s - 1],
        apply: agree[s - 1],
        nps: [10, 9, 8, 10, 7, 9][i],
        hours: 2 + i,
        mode: "In person",
        used: ["Slides"],
        why: "Clear trainer",
      },
      { country: "Ghana" },
    ),
  ),
  ...[2, 2, 3, 1].map((s, i) =>
    row(
      {
        useful: agree[s],
        apply: agree[s - 1],
        nps: [3, 4, 6, 2][i],
        hours: 1,
        mode: "Online",
        used: ["Slides", "Videos"],
      },
      { country: "Kenya", gender: "Man" },
    ),
  ),
];
const lonely = row({ useful: "Agree", nps: 5 }, { country: "Togo" }); // a group of one

describe("summaries", () => {
  it("counts choices, including several answers per person", () => {
    const s = A.summarise(Q.used, rows);
    expect(s).toEqual({
      kind: "choice",
      n: 10,
      multi: true,
      top2: undefined,
      counts: [
        { option: "Slides", count: 10, pct: 100 },
        { option: "Videos", count: 4, pct: 40 },
      ],
    });
  });
  it("gives the top-2 box for Likert questions", () => {
    const s = A.summarise(Q.useful, rows);
    expect(s.kind === "choice" && s.top2).toBe(70); // 6 in Ghana + 1 "Agree" in Kenya
  });
  it("describes numbers and computes the Net Promoter Score on 0–10 scales", () => {
    const s = A.summarise(Q.nps, rows);
    if (s.kind !== "numeric") throw new Error("expected numeric");
    expect(s.stats!.mean).toBeCloseTo(6.8, 10);
    expect(s.nps).toEqual({ nps: 0, pro: 40, det: 40, n: 10 }); // 4 promoters, 4 detractors
    expect(s.distribution!.find((d) => d.value === 10)!.count).toBe(2);
  });
  it("lists written answers", () => {
    expect(A.summarise(Q.why, rows)).toEqual({ kind: "text", n: 6, answers: Array(6).fill("Clear trainer") });
  });
});

describe("protecting small groups", () => {
  it("never shows a group of fewer than 3 people, only counts them", () => {
    const g = A.safeGroups([...rows, lonely], "country");
    expect(g.groups.map(([name, rs]) => [name, rs.length])).toEqual([
      ["Ghana", 6],
      ["Kenya", 4],
    ]);
    expect([g.hiddenGroups, g.hiddenPeople]).toEqual([1, 1]);
  });
  it("leaves small groups out of comparisons and cross-tabulations", () => {
    const c = A.compareGroups(Q.nps, [...rows, lonely], "country");
    expect(c.groups.map((x) => x.name)).toEqual(["Ghana", "Kenya"]);
    expect(c.hiddenPeople).toBe(1);
    expect(c.test?.kind).toBe("welch");
    const x = A.crosstab([...rows, lonely], "country", "q:mode");
    expect(x.rowLabels).toEqual(["Ghana", "Kenya"]);
    expect(x.table).toEqual([
      [6, 0],
      [0, 4],
    ]);
  });
  it("groups ages into bands", () => {
    expect([18, 24, 25, 44, 64, 65].map(A.ageBand)).toEqual(["18–24", "18–24", "25–34", "35–44", "55–64", "65+"]);
  });
});

describe("insights and drivers", () => {
  it("writes insight cards only from the data", () => {
    const cards = A.insights(questions, rows, { total: 12, flagged: 2 });
    expect(cards.map((c) => c.label)).toEqual([
      "Strongest area",
      "Fix first",
      "Net Promoter Score",
      "Top-2 box",
      "Top-2 box",
      "Most common answer",
      "Biggest group difference",
      "Data quality",
    ]);
    expect(cards.find((c) => c.label === "Net Promoter Score")!.title).toBe("0 · Fair");
    // In this sample everyone in Ghana is a woman and everyone in Kenya a man, so gender and country split
    // people identically; gender is checked first (as in Phase 1) and an equal gap doesn't replace it.
    expect(cards.find((c) => c.label === "Biggest group difference")!.title).toBe("Woman vs Man");
    expect(cards.find((c) => c.label === "Data quality")!.title).toBe("83% passed quality checks");
    expect(A.insights(questions, [], { total: 0, flagged: 0 })).toEqual([]);
  });
  it("ranks key drivers by the strength of their link to the outcome", () => {
    expect(A.defaultOutcome(questions)).toBe("nps");
    const d = A.drivers(questions, rows, "nps");
    expect(d[0]!.q.id).toBe("apply");
    expect(d[0]!.r!).toBeGreaterThan(0.9);
    expect(d[0]!.p!).toBeLessThan(0.001);
    expect(A.strength(d[0]!.r!)).toBe("Strong");
  });
  it("tests reliability and correlation", () => {
    expect(A.reliability([Q.useful, Q.apply], rows)).toMatchObject({ n: 10, k: 2 });
    expect(A.correlation(Q.useful, Q.nps, rows)!.r).toBeGreaterThan(0.8);
  });
});

describe("response quality", () => {
  it("flags attention failures, speeding, straight-lining and junk answers", () => {
    const bad = row(
      { useful: "Agree", apply: "Agree", nps: 7, why: "asdf" },
      {},
      { passedAttention: false, speeder: true },
    );
    const r = A.responseQuality([Q.useful, Q.apply, Q.why, Q.mode], bad);
    expect(r.flags).toEqual([
      "Failed the attention check",
      "Finished much faster than expected",
      "1 very short or meaningless written answer",
    ]);
    expect(r.score).toBe(20);
    expect(A.responseQuality(questions, rows[0]!).score).toBe(100);
  });
  it("describes p-values in plain terms", () => {
    expect([A.significance(0.0004), A.significance(0.0321), A.isSignificant(0.04), A.isSignificant(0.2)]).toEqual([
      "p < .001",
      "p = .032",
      true,
      false,
    ]);
  });
});
