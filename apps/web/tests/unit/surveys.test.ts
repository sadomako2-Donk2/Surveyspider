import { describe, expect, it } from "vitest";
import {
  ATTENTION,
  LIKERT_SETS,
  SURVEY_TEMPLATES,
  checkAnswers,
  eligible,
  hourlyRate,
  isSpeeder,
  maxCostMinor,
  normaliseQuestion,
  OPEN_SCREENING,
  questionProblems,
  scaleOf,
} from "@/lib/surveys";

const q = (over: Record<string, unknown>) => ({ id: "q", ...normaliseQuestion(over) });

describe("questions", () => {
  it("fills Phase 1 defaults", () => {
    expect(normaliseQuestion({ type: "rating", text: "  How appealing?  " })).toEqual({
      type: "RATING",
      text: "How appealing?",
      options: [],
      scale: { min: 1, max: 5, minLabel: "Lowest", maxLabel: "Highest" },
      required: true,
    });
    expect(scaleOf({ min: "0", max: 10 })).toMatchObject({ min: 0, max: 10 });
    expect(normaliseQuestion({ type: "text", options: ["a"] }).options).toEqual([]);
  });
  it("explains what's wrong, numbered as people see the questions", () => {
    expect(questionProblems([])).toEqual(["Add at least one question."]);
    expect(
      questionProblems([
        normaliseQuestion({ type: "SINGLE", text: "", options: ["Yes"] }),
        normaliseQuestion({ type: "MULTI", text: "Pick", options: ["A", "a"] }),
        normaliseQuestion({ type: "RATING", text: "Rate", scale: { min: 1, max: 20 } }),
        normaliseQuestion({ type: "TEXT", text: "Why?" }),
      ]),
    ).toEqual([
      "Question 1 has no wording.",
      "Question 1 needs at least two answer options.",
      "Question 2 has the same answer option twice.",
      "Question 3: the scale must run upwards from 0 or more, with at most 11 points (like 1–5, 1–10 or 0–10).",
    ]);
  });
  it("brings every Phase 1 template and Likert set across intact", () => {
    expect(SURVEY_TEMPLATES.map((t) => t.key)).toEqual([
      "cx",
      "concept",
      "academic",
      "tna",
      "posttrain",
      "leader360",
      "engage",
    ]);
    for (const t of SURVEY_TEMPLATES) expect(questionProblems(t.questions)).toEqual([]);
    expect(Object.keys(LIKERT_SETS)).toHaveLength(10);
    expect(LIKERT_SETS.agree5!.options).toEqual([
      "Strongly disagree",
      "Disagree",
      "Neither agree nor disagree",
      "Agree",
      "Strongly agree",
    ]);
    const engage = SURVEY_TEMPLATES.find((t) => t.key === "engage")!;
    expect(engage.questions[0]!.scale).toEqual({
      min: 0,
      max: 10,
      minLabel: "Not at all likely",
      maxLabel: "Extremely likely",
    });
  });
});

describe("answers", () => {
  const qs = [
    q({ id: "a", type: "SINGLE", text: "One", options: ["Yes", "No"] }),
    q({ id: "b", type: "MULTI", text: "Many", options: ["X", "Y", "Z"] }),
    q({ id: "c", type: "RATING", text: "Rate", scale: { min: 0, max: 10 } }),
    q({ id: "d", type: "LIKERT", text: "Agree", options: LIKERT_SETS.agree5!.options }),
    q({ id: "e", type: "NUMBER", text: "Hours" }),
    q({ id: "f", type: "TEXT", text: "Why", required: false }),
  ].map((x, i) => ({ ...x, id: "abcdef"[i]! }));

  it("accepts valid answers of every type", () => {
    const r = checkAnswers(qs, { a: "Yes", b: ["X", "Z"], c: 0, d: "Agree", e: "2.5", f: "  Because  " });
    expect(r).toEqual({
      answers: { a: "Yes", b: ["X", "Z"], c: 0, d: "Agree", e: 2.5, f: "Because" },
      missing: [],
      invalid: [],
      unknown: [],
    });
  });
  it("lists missing required answers and ignores empty optional ones", () => {
    expect(checkAnswers(qs, { b: [], f: "" }).missing).toEqual([1, 2, 3, 4, 5]);
  });
  it("refuses answers that aren't offered or out of range", () => {
    const r = checkAnswers(qs, { a: "Maybe", b: ["X", "X"], c: 11, d: "agree", e: "lots", f: 42, zz: "x" });
    expect(r.invalid).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.unknown).toEqual(["zz"]);
    expect(checkAnswers(qs, { a: "Yes", b: ["X"], c: 2.5, d: "Agree", e: 1 }).invalid).toEqual([3]);
  });
  it("doesn't count the system attention check as an unknown question", () => {
    expect(checkAnswers(qs, { [ATTENTION.key]: "Purple" }).unknown).toEqual([]);
  });
});

describe("screening, timing and money", () => {
  const p = { age: 30, gender: "Woman", country: "Ghana", occupation: "Student" };
  it("lets anyone answer an open survey, even without a profile", () => {
    expect(eligible(OPEN_SCREENING, null)).toBe(true);
  });
  it("applies screening when set", () => {
    const s = { ...OPEN_SCREENING, countries: ["Ghana"], occupations: ["Student"], maxAge: 35 };
    expect([
      eligible(s, p),
      eligible(s, null),
      eligible(s, { ...p, age: 40 }),
      eligible(s, { ...p, country: "Kenya" }),
    ]).toEqual([true, false, false, false]);
  });
  it("flags people who finish in under 30% of the expected time", () => {
    expect([isSpeeder(80, 5), isSpeeder(95, 5), isSpeeder(null, 5)]).toEqual([true, false, false]);
  });
  it("works out pay and cost", () => {
    expect(hourlyRate(100, 5)).toBe(12);
    expect(maxCostMinor(100, 150)).toBe(18750);
  });
});
