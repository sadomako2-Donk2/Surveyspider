// Runs the Phase 1 library (straight out of public/index.html) and the Phase 2 port side by side on
// thousands of random inputs. They must agree exactly: the port changes no maths.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import * as S2 from "@/lib/stats";

const html = readFileSync(path.join(import.meta.dirname, "..", "..", "..", "..", "public", "index.html"), "utf8");
const S1 = new Function(
  `${html.slice(html.indexOf("/*STAT-START*/"), html.indexOf("/*STAT-END*/"))}; return STAT;`,
)() as typeof S2;

let seed = 20261121;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const sample = (n: number, scale = 10) => Array.from({ length: n }, () => Math.round(rand() * scale * 100) / 100);
const same = (a: unknown, b: unknown) => expect(JSON.stringify(a)).toBe(JSON.stringify(b));

it("matches Phase 1 exactly on 2,000 random inputs", () => {
  for (let i = 0; i < 2000; i++) {
    const n1 = 2 + Math.floor(rand() * 40),
      n2 = 2 + Math.floor(rand() * 40),
      df = 1 + rand() * 80;
    const a = sample(n1),
      b = sample(n2),
      c = sample(2 + Math.floor(rand() * 30));
    const t = rand() * 6,
      F = rand() * 8,
      x = rand() * 30;
    same(S2.tP(t, df), S1.tP(t, df));
    same(S2.fP(F, 1 + (i % 5), Math.ceil(df)), S1.fP(F, 1 + (i % 5), Math.ceil(df)));
    same(S2.chiP(x, 1 + (i % 9)), S1.chiP(x, 1 + (i % 9)));
    same(S2.describe(a), S1.describe(a));
    same(S2.welch(a, b), S1.welch(a, b));
    same(S2.anova([a, b, c]), S1.anova([a, b, c]));
    const m = Math.min(n1, n2);
    same(S2.corr(a.slice(0, m), b.slice(0, m)), S1.corr(a.slice(0, m), b.slice(0, m)));
    const tab = [sample(3, 20).map(Math.round), sample(3, 20).map(Math.round)];
    if (tab.flat().some((v) => v > 0) && tab.every((r) => r.some((v) => v > 0)))
      same(S2.chiSquare(tab), S1.chiSquare(tab));
    const items = Array.from({ length: 3 + (i % 20) }, () => sample(4, 5).map(Math.round));
    same(S2.cronbach(items), S1.cronbach(items));
  }
  same(S2.tCrit(7), S1.tCrit(7));
});
