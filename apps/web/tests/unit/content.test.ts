import { describe, expect, it } from "vitest";
import { CONFIDENCE, invitations, sampleSize } from "@/lib/sample-size";
import { GUIDES, UNITS, guideBySlug } from "@/content/pages";

describe("sample size", () => {
  it("matches the standard table for a large population at 95% confidence", () => {
    expect([0.1, 0.05, 0.03, 0.02].map((e) => sampleSize(1.96, e))).toEqual([97, 385, 1068, 2401]);
  });
  it("applies the finite population correction", () => {
    expect(sampleSize(1.96, 0.05, 300)).toBe(169);
    expect(sampleSize(1.96, 0.05, 1_000_000)).toBe(385);
  });
  it("uses the other confidence levels", () => {
    expect(CONFIDENCE.map((c) => sampleSize(c.z, 0.05))).toEqual([271, 385, 664]);
  });
  it("refuses nonsense input instead of inventing a number", () => {
    expect(sampleSize(1.96, 0)).toBeNaN();
    expect(sampleSize(1.96, 1.5)).toBeNaN();
  });
  it("allows for non-response", () => {
    expect(invitations(169, 0.4)).toBe(423);
    expect(invitations(385, 1)).toBe(385);
  });
});

describe("content", () => {
  it("has four service lines linking to their pages", () => {
    expect(UNITS.map((u) => u.href)).toEqual(["/training", "/surveys", "/analytics", "/consultancy"]);
  });
  it("has guides with unique, URL-safe slugs and some text in every section", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) {
      expect(g.slug).toMatch(/^[a-z0-9-]+$/);
      for (const s of g.sections) expect(s.body.length > 0 || s.sampleTable).toBeTruthy();
    }
    expect(guideBySlug("how-many-responses-do-you-need")?.sections.some((s) => s.sampleTable)).toBe(true);
  });
});
