import { describe, expect, it } from "vitest";
import {
  cleanTurns,
  dataSummary,
  normaliseAiQuestions,
  normaliseCheck,
  normaliseDraft,
  normaliseReport,
} from "@/lib/ai";
import type { AQ, ARow } from "@/lib/analysis";

describe("questions from Claude", () => {
  it("become valid builder questions, or open text when they can't be used as written", () => {
    expect(
      normaliseAiQuestions([
        { type: "Single", text: " Where? ", options: ["A", "A", " B ", ""] },
        { type: "likert", text: "Too few labels", options: ["Agree"] },
        { type: "rating", text: "Rate it", scale: { min: 3, max: 99, minLabel: "Low" } },
        { type: "weird", text: "Unknown type" },
        { type: "text", text: "" },
        "not an object",
      ]),
    ).toEqual([
      { type: "SINGLE", text: "Where?", options: ["A", "B"], scale: null, required: true },
      { type: "TEXT", text: "Too few labels", options: [], scale: null, required: true },
      {
        type: "RATING",
        text: "Rate it",
        options: [],
        scale: { min: 1, max: 10, minLabel: "Low", maxLabel: "" },
        required: true,
      },
      { type: "TEXT", text: "Unknown type", options: [], scale: null, required: true },
    ]);
  });

  it("keep a draft's completion time realistic", () => {
    expect(normaliseDraft({ minutes: 500, questions: [] }).minutes).toBe(60);
    expect(normaliseDraft({ questions: Array(10).fill({ type: "text", text: "Q" }) }).minutes).toBe(6);
  });

  it("checker items must point at a real question", () => {
    expect(
      normaliseCheck(
        {
          items: [
            { q: 1, issue: "Vague" },
            { q: 0, issue: "x" },
            { q: 1.5, issue: "x" },
          ],
        },
        2,
      ),
    ).toEqual([{ q: 1, issue: "Vague", rewrite: "" }]);
  });
});

describe("reports", () => {
  it("are rejected without a headline or findings, and priorities are checked", () => {
    expect(normaliseReport({ headline: "Only a headline" }, 5, "x")).toBeNull();
    const r = normaliseReport(
      {
        headline: "H",
        findings: [{ title: "F", detail: "D" }],
        recommendations: [{ action: "Do it", priority: "urgent" }],
      },
      5,
      "basis",
      new Date("2026-11-21T00:00:00Z"),
    )!;
    expect(r.recommendations[0]!.priority).toBe("medium");
    expect(r).toMatchObject({ responses: 5, basis: "basis", generatedAt: "2026-11-21T00:00:00.000Z", themes: [] });
  });
});

describe("conversations", () => {
  it("start and end with the client, merge repeated turns and drop unknown roles", () => {
    expect(
      cleanTurns([
        { role: "assistant", content: "hi" },
        { role: "user", content: "a" },
        { role: "user", content: "b" },
        { role: "system", content: "x" },
      ]),
    ).toEqual([{ role: "user", content: "a\n\nb" }]);
    expect(
      cleanTurns([
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
      ]),
    ).toBeNull();
    expect(cleanTurns("nonsense")).toBeNull();
  });
});

describe("the data summary sent to Claude", () => {
  const q: AQ = { id: "q1", type: "SINGLE", text: "Pick one", options: ["Yes", "No"], scale: null, required: true };
  const row = (i: number, country: string, a: string): ARow => ({
    id: `r${i}`,
    code: `P00${i}`,
    status: "APPROVED",
    version: 1,
    submittedAt: "2026-11-01T00:00:00Z",
    durationSeconds: 100,
    passedAttention: null,
    speeder: false,
    demographics: { age: 30, country },
    answers: { q1: a },
  });
  const rows = [row(1, "Ghana", "Yes"), row(2, "Ghana", "Yes"), row(3, "Ghana", "No"), row(4, "Togo", "No")];

  it("gives counts and percentages and never names a group under three people or a participant code", () => {
    const s = dataSummary({ title: "T", description: "" }, [q], rows, "all");
    expect(s).toContain("Responses analysed: 4 (all)");
    expect(s).toContain("Yes: 2 (50%); No: 2 (50%)");
    expect(s).toContain("Country: Ghana 3, smaller groups combined 1");
    expect(s).toContain("Age group: 25–34 4");
    expect(s).not.toContain("Togo");
    expect(s).not.toMatch(/P00\d|r\d\b/);
  });
});
