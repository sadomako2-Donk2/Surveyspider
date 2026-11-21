// The Phase 2 quote must equal Phase 1's for every combination of inputs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIENCE,
  F2F_METHODS,
  REPORTS,
  SETTING,
  f2fQuote,
  f2fReady,
  parseInputs,
  type FieldworkInputs,
} from "@/lib/fieldwork";
import type { QuestionTypeCode } from "@/lib/surveys";

const html = readFileSync(path.join(import.meta.dirname, "..", "..", "..", "..", "public", "index.html"), "utf8");
const start = html.indexOf("  const F2F_TIER = {"),
  end = html.indexOf("  const usd = (x) =>", start);
const phase1 = new Function("S", "studyById", `${html.slice(start, end)}; return { f2fQuote };`)(
  { f2f: {}, imp: {} },
  () => null,
) as {
  f2fQuote: (F: unknown, sv: { questions: { type: string }[] } | null) => unknown;
};

let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
const TYPES: QuestionTypeCode[] = ["SINGLE", "MULTI", "LIKERT", "RATING", "NUMBER", "TEXT"];
const COUNTRIES = ["Ghana", "Nigeria", "United Kingdom", "South Africa", "Kenya", "Brazil", "United States", "Other"];

describe("Paper Survey quotes", () => {
  it("match Phase 1 exactly across 3,000 random projects", () => {
    for (let i = 0; i < 3000; i++) {
      const F: FieldworkInputs = {
        method: pick(Object.keys(F2F_METHODS) as FieldworkInputs["method"][]),
        n: Math.floor(rand() * 2000) + (i % 7 === 0 ? 0 : 1),
        groups: Math.floor(rand() * 20),
        perGroup: Math.floor(rand() * 14),
        country: pick(COUNTRIES),
        setting: pick(Object.keys(SETTING) as FieldworkInputs["setting"][]),
        audience: pick(Object.keys(AUDIENCE) as FieldworkInputs["audience"][]),
        capture: pick(["tablet", "paper"] as const),
        minutes: i % 3 === 0 ? Math.floor(rand() * 120) : "",
        languages: Math.floor(rand() * 4),
        backTranslation: rand() > 0.5,
        record: rand() > 0.5,
        transcription: rand() > 0.5,
        incentive: i % 4 === 0 ? Math.round(rand() * 2000) / 100 : "",
        report: pick(Object.keys(REPORTS) as FieldworkInputs["report"][]),
        urgency: pick(["standard", "rush"] as const),
      };
      const types = i % 5 === 0 ? null : Array.from({ length: Math.floor(rand() * 40) }, () => pick(TYPES));
      const p1 = phase1.f2fQuote(F, types ? { questions: types.map((t) => ({ type: t.toLowerCase() })) } : null);
      expect(JSON.stringify(f2fQuote(F, types))).toBe(JSON.stringify(p1));
    }
  });

  it("gives a known price for a typical Ghana survey", () => {
    const q = f2fQuote(
      {
        ...parseInputs({
          method: "questionnaire",
          n: 300,
          country: "Ghana",
          setting: "urban",
          audience: "general",
          report: "summary",
          minutes: 15,
        })!,
      },
      null,
    );
    expect(q.mins).toBe(15);
    expect(q.tier).toBe("C");
    expect(q.lines[0]).toEqual({
      group: "Fieldwork",
      label: "Interviewer fee per completed interview (15 min)",
      qty: 300,
      unit: 6,
      amount: 1800,
    });
    expect(q.total).toBeGreaterThan(q.lines[0]!.amount);
  });

  it("needs a survey, a length or a focus group before quoting", () => {
    const F = parseInputs({
      method: "questionnaire",
      country: "Ghana",
      setting: "urban",
      audience: "general",
      report: "none",
    })!;
    expect([
      f2fReady(F, null),
      f2fReady({ ...F, minutes: 20 }, null),
      f2fReady({ ...F, method: "fgd" }, null),
      f2fReady(F, ["SINGLE"]),
    ]).toEqual([false, true, true, true]);
  });

  it("rejects unknown options from a tampered request", () => {
    expect(
      parseInputs({ method: "telepathy", country: "Ghana", setting: "urban", audience: "general", report: "none" }),
    ).toBeNull();
    expect(
      parseInputs({ method: "fgd", country: "Ghana", setting: "urban", audience: "aliens", report: "none" }),
    ).toBeNull();
  });
});
