// Checks the in-page statistics library (between /*STAT-START*/ and /*STAT-END*/ in index.html)
// against reference values computed with SciPy (tests/expected.json).
// Run: node tests/stats.test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "public", "index.html"), "utf8");
const src = html.slice(html.indexOf("/*STAT-START*/"), html.indexOf("/*STAT-END*/"));
const STAT = new Function(src + "; return STAT;")();
const E = JSON.parse(readFileSync(join(here, "expected.json"), "utf8"));
let fails = 0, passes = 0;
const near = (name, got, want, tol = 1e-4) => {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  ok ? passes++ : fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(28)} got ${(+got).toPrecision(8)}  want ${(+want).toPrecision(8)}`);
};
near("t-test p (t=2, df=10)", STAT.tP(2, 10), E.tP_2_10);
near("F p (F=3, 2, 20)", STAT.fP(3, 2, 20), E.fP_3_2_20);
near("chi-square p (3.841, 1)", STAT.chiP(3.841, 1), E.chiP_3841_1);
near("chi-square p (10, 4)", STAT.chiP(10, 4), E.chiP_10_4);
near("t critical, df=10", STAT.tCrit(10), E.tCrit_10);
near("t critical, df=3", STAT.tCrit(3), E.tCrit_3);
const w = STAT.welch(E.a, E.b);
near("Welch t", w.t, E.welch_t); near("Welch p", w.p, E.welch_p);
const an = STAT.anova([E.a, E.b, E.c]);
near("ANOVA F", an.F, E.anova_F); near("ANOVA p", an.p, E.anova_p);
const ch = STAT.chiSquare(E.tab);
near("chi-square statistic", ch.chi, E.chi); near("chi-square p", ch.p, E.chi_p); near("chi-square df", ch.df, E.chi_df);
const r = STAT.corr(E.x, E.y);
near("Pearson r", r.r, E.r); near("Pearson p", r.p, E.r_p);
near("Cronbach's alpha", STAT.cronbach(E.items), E.alpha);
const d = STAT.describe(E.a);
near("SD", d.sd, E.sd_a); near("95% CI low", d.lo, E.ci_lo); near("95% CI high", d.hi, E.ci_hi);
// edge cases must not crash or return nonsense
const edge = [STAT.welch([1, 1], [1, 1]), STAT.anova([[1, 1], [1, 1]]), STAT.corr([1, 1, 1], [2, 3, 4]), STAT.cronbach([[1, 2]])];
const edgeOk = edge.every((x) => x === null); edgeOk ? passes++ : fails++;
console.log(`${edgeOk ? "PASS" : "FAIL"}  zero-variance / too-few inputs return null`);
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
