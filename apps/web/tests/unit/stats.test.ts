// The Phase 1 SciPy checks (tests/stats.test.mjs at the repository root), run against the Phase 2 library.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe as group, expect, it } from "vitest";
import * as S from "@/lib/stats";

const E = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "..", "..", "..", "..", "tests", "expected.json"), "utf8"),
);
const near = (got: number, want: number, tol = 1e-4) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(want)));

group("statistics library against SciPy", () => {
  it("p-values and critical values", () => {
    near(S.tP(2, 10), E.tP_2_10);
    near(S.fP(3, 2, 20), E.fP_3_2_20);
    near(S.chiP(3.841, 1), E.chiP_3841_1);
    near(S.chiP(10, 4), E.chiP_10_4);
    near(S.tCrit(10), E.tCrit_10);
    near(S.tCrit(3), E.tCrit_3);
  });
  it("Welch t-test", () => {
    const w = S.welch(E.a, E.b)!;
    near(w.t, E.welch_t);
    near(w.p, E.welch_p);
  });
  it("one-way ANOVA", () => {
    const an = S.anova([E.a, E.b, E.c])!;
    near(an.F, E.anova_F);
    near(an.p, E.anova_p);
  });
  it("chi-square test", () => {
    const ch = S.chiSquare(E.tab);
    near(ch.chi, E.chi);
    near(ch.p, E.chi_p);
    near(ch.df, E.chi_df);
  });
  it("Pearson correlation", () => {
    const r = S.corr(E.x, E.y)!;
    near(r.r, E.r);
    near(r.p, E.r_p);
  });
  it("Cronbach's alpha", () => near(S.cronbach(E.items)!, E.alpha));
  it("descriptives with a 95% confidence interval", () => {
    const d = S.describe(E.a);
    near(d.sd, E.sd_a);
    near(d.lo, E.ci_lo);
    near(d.hi, E.ci_hi);
  });
  it("returns null instead of nonsense for zero variance or too few values", () => {
    expect([
      S.welch([1, 1], [1, 1]),
      S.anova([
        [1, 1],
        [1, 1],
      ]),
      S.corr([1, 1, 1], [2, 3, 4]),
      S.cronbach([[1, 2]]),
    ]).toEqual([null, null, null, null]);
  });
});
