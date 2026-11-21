// Survey analysis: summaries, insight cards, group comparisons, key drivers, statistical tests and quality.
// Ported from Phase 1's Analyze workspace; statistics come from @/lib/stats. Nothing here invents data:
// every figure is computed from the responses passed in, and groups smaller than MIN_GROUP are never shown.
import * as STAT from "@/lib/stats";
import { scaleOf, type AnswerValue, type QuestionInput } from "@/lib/surveys";

/** Groups smaller than this are never shown on their own, to protect anonymity (same as Phase 1). */
export const MIN_GROUP = 3;

export type AQ = QuestionInput & { id: string };
export interface ARow {
  id: string;
  code: string; // P001, P002… never an account id or email
  status: "APPROVED" | "FLAGGED";
  version: number;
  submittedAt: string;
  durationSeconds: number | null;
  passedAttention: boolean | null;
  speeder: boolean;
  demographics: { age?: number; gender?: string; country?: string; occupation?: string } | null;
  answers: Record<string, AnswerValue>;
}

export const SEGMENTS = [
  ["age", "Age group"],
  ["gender", "Gender"],
  ["country", "Country"],
  ["occupation", "Occupation"],
] as const;

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const short = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export const isNumQ = (q: AQ) => q.type === "RATING" || q.type === "LIKERT" || q.type === "NUMBER";
export const isScaleQ = (q: AQ) => q.type === "RATING" || q.type === "LIKERT";
export const isCategoryQ = (q: AQ) => q.type === "SINGLE" || q.type === "LIKERT";

/** Numeric score: the number itself, or the Likert position (1 = first label). */
export function scoreOf(q: AQ, v: AnswerValue | undefined): number | null {
  if (v == null || v === "") return null;
  if (q.type === "RATING" || q.type === "NUMBER") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (q.type === "LIKERT") {
    const i = q.options.indexOf(String(v));
    return i < 0 ? null : i + 1;
  }
  return null;
}
/** Score scaled to 0–1 across the question's scale, so different scales can be compared. */
export function normScore(q: AQ, v: AnswerValue | undefined): number | null {
  const s = scoreOf(q, v);
  if (s == null) return null;
  if (q.type === "RATING") {
    const sc = scaleOf(q.scale);
    return (s - sc.min) / (sc.max - sc.min || 1);
  }
  if (q.type === "LIKERT") return (s - 1) / (q.options.length - 1 || 1);
  return null;
}
export const scaleMax = (q: AQ) =>
  q.type === "RATING" ? scaleOf(q.scale).max : q.type === "LIKERT" ? q.options.length : null;
export const fmtAvg = (q: AQ, a: number | null) =>
  a == null
    ? "–"
    : q.type === "NUMBER"
      ? a.toLocaleString("en-US", { maximumFractionDigits: 1 })
      : `${a.toFixed(1)} of ${scaleMax(q)}`;

export function ageBand(a?: number): string {
  if (!a) return "Unknown";
  if (a < 25) return "18–24";
  if (a < 35) return "25–34";
  if (a < 45) return "35–44";
  if (a < 55) return "45–54";
  if (a < 65) return "55–64";
  return "65+";
}

/** A row's value for a grouping key: a demographic ("age", "gender", …) or another question ("q:<id>"). */
export function segValue(r: ARow, key: string): string | null {
  if (key.startsWith("q:")) {
    const v = r.answers[key.slice(2)];
    return v == null || v === "" || Array.isArray(v) ? null : String(v);
  }
  const d = r.demographics ?? {};
  if (key === "age") return d.age ? ageBand(d.age) : null;
  const v = d[key as "gender" | "country" | "occupation"];
  return v ? String(v) : null;
}

/**
 * Splits rows into groups. Groups with fewer than MIN_GROUP people are left out and only counted
 * (hiddenPeople), so nobody can be singled out.
 */
export function safeGroups(rows: ARow[], key: string) {
  const m = new Map<string, ARow[]>();
  for (const r of rows) {
    const v = segValue(r, key);
    if (v == null) continue;
    if (!m.has(v)) m.set(v, []);
    m.get(v)!.push(r);
  }
  const all = [...m].sort((a, b) => b[1].length - a[1].length);
  const shown = all.filter(([, rs]) => rs.length >= MIN_GROUP);
  return {
    groups: shown,
    hiddenGroups: all.length - shown.length,
    hiddenPeople: all.filter(([, rs]) => rs.length < MIN_GROUP).reduce((a, [, rs]) => a + rs.length, 0),
  };
}

// ---------- per-question summaries ----------

export type Summary =
  | {
      kind: "choice";
      n: number;
      counts: { option: string; count: number; pct: number }[];
      top2?: number;
      multi: boolean;
    }
  | {
      kind: "numeric";
      n: number;
      stats: STAT.Description | null;
      nps?: ReturnType<typeof npsOf>;
      distribution?: { value: number; count: number; pct: number }[];
    }
  | { kind: "text"; n: number; answers: string[] };

export function npsOf(q: AQ, rows: ARow[]) {
  const nums = rows.map((r) => scoreOf(q, r.answers[q.id])).filter((x): x is number => x != null);
  if (!nums.length) return null;
  const pro = nums.filter((x) => x >= 9).length,
    det = nums.filter((x) => x <= 6).length;
  return {
    nps: Math.round(((pro - det) / nums.length) * 100),
    pro: pct(pro, nums.length),
    det: pct(det, nums.length),
    n: nums.length,
  };
}
const isNpsScale = (q: AQ) => q.type === "RATING" && scaleOf(q.scale).min === 0 && scaleOf(q.scale).max === 10;

export function summarise(q: AQ, rows: ARow[]): Summary {
  const vals = rows
    .map((r) => r.answers[q.id])
    .filter((v) => v != null && v !== "" && !(Array.isArray(v) && !v.length));
  if (q.type === "SINGLE" || q.type === "LIKERT" || q.type === "MULTI") {
    const counts = q.options.map((option) => {
      const count = vals.filter((v) => (Array.isArray(v) ? v.includes(option) : v === option)).length;
      return { option, count, pct: pct(count, vals.length) };
    });
    const top2 =
      q.type === "LIKERT" && vals.length
        ? pct(vals.filter((v) => q.options.slice(-2).includes(String(v))).length, vals.length)
        : undefined;
    return { kind: "choice", n: vals.length, counts, top2, multi: q.type === "MULTI" };
  }
  if (q.type === "RATING" || q.type === "NUMBER") {
    const nums = vals.map((v) => Number(v)).filter(Number.isFinite);
    const out: Summary = { kind: "numeric", n: nums.length, stats: nums.length ? STAT.describe(nums) : null };
    if (q.type === "RATING") {
      const sc = scaleOf(q.scale);
      out.distribution = Array.from({ length: sc.max - sc.min + 1 }, (_, i) => sc.min + i).map((value) => {
        const count = nums.filter((n) => n === value).length;
        return { value, count, pct: pct(count, nums.length) };
      });
      if (isNpsScale(q)) out.nps = npsOf(q, rows);
    }
    return out;
  }
  return { kind: "text", n: vals.length, answers: vals.map(String) };
}

// ---------- insight cards (Phase 1 autoInsights) ----------

export interface Insight {
  tone: "good" | "warn" | "info";
  label: string;
  title: string;
  text: string;
}

export function insights(questions: AQ[], rows: ARow[], quality: { total: number; flagged: number }): Insight[] {
  const out: Insight[] = [];
  if (!rows.length) return out;
  const items = questions
    .filter(isScaleQ)
    .map((q) => {
      const v = rows.map((r) => normScore(q, r.answers[q.id])).filter((x): x is number => x != null);
      return {
        q,
        avg: avg(v),
        raw: avg(rows.map((r) => scoreOf(q, r.answers[q.id])).filter((x): x is number => x != null)),
        n: v.length,
      };
    })
    .filter((x) => x.avg != null);
  const ranked = [...items].sort((a, b) => b.avg! - a.avg!);
  if (ranked.length >= 2) {
    const top = ranked[0]!,
      low = ranked[ranked.length - 1]!;
    out.push({
      tone: "good",
      label: "Strongest area",
      title: short(top.q.text, 90),
      text: `Average ${fmtAvg(top.q, top.raw)}, the highest of ${ranked.length} scale questions (${Math.round(top.avg! * 100)}% of the maximum).`,
    });
    out.push({
      tone: "warn",
      label: "Fix first",
      title: short(low.q.text, 90),
      text: `Average ${fmtAvg(low.q, low.raw)}, the lowest of the scale questions (${Math.round(low.avg! * 100)}% of the maximum).`,
    });
  } else if (ranked.length === 1) {
    const only = ranked[0]!;
    out.push({
      tone: "info",
      label: "Average score",
      title: short(only.q.text, 90),
      text: `Average ${fmtAvg(only.q, only.raw)} from ${only.n} answers.`,
    });
  }
  questions.filter(isNpsScale).forEach((q) => {
    const n = npsOf(q, rows);
    if (!n) return;
    const word = n.nps >= 50 ? "Excellent" : n.nps >= 20 ? "Good" : n.nps >= 0 ? "Fair" : "Needs work";
    out.push({
      tone: n.nps >= 0 ? "good" : "warn",
      label: "Net Promoter Score",
      title: `${n.nps > 0 ? "+" : ""}${n.nps} · ${word}`,
      text: `${n.pro}% promoters (9–10) and ${n.det}% detractors (0–6) on "${short(q.text, 60)}".`,
    });
  });
  questions
    .filter((q) => q.type === "LIKERT")
    .slice(0, 2)
    .forEach((q) => {
      const s = summarise(q, rows);
      if (s.kind !== "choice" || !s.n || s.top2 == null) return;
      out.push({
        tone: s.top2 >= 60 ? "good" : s.top2 >= 40 ? "info" : "warn",
        label: "Top-2 box",
        title: `${s.top2}% positive`,
        text: `chose "${q.options[q.options.length - 2]}" or "${q.options[q.options.length - 1]}" for "${short(q.text, 60)}".`,
      });
    });
  questions
    .filter((q) => q.type === "SINGLE")
    .slice(0, 2)
    .forEach((q) => {
      const s = summarise(q, rows);
      if (s.kind !== "choice" || !s.n) return;
      const best = [...s.counts].sort((a, b) => b.count - a.count)[0]!;
      out.push({
        tone: "info",
        label: "Most common answer",
        title: short(best.option, 60),
        text: `${best.pct}% chose this for "${short(q.text, 60)}".`,
      });
    });
  let best: {
    diff: number;
    q: AQ;
    label: string;
    hi: { name: string; n: number; avg: number };
    lo: { name: string; n: number; avg: number };
  } | null = null;
  for (const { q } of items)
    for (const [key, label] of SEGMENTS) {
      const g = safeGroups(rows, key)
        .groups.map(([name, rs]) => ({
          name,
          n: rs.length,
          avg: avg(rs.map((r) => normScore(q, r.answers[q.id])).filter((x): x is number => x != null)),
        }))
        .filter((x): x is { name: string; n: number; avg: number } => x.avg != null && x.n >= MIN_GROUP);
      if (g.length < 2) continue;
      g.sort((a, b) => b.avg - a.avg);
      const diff = g[0]!.avg - g[g.length - 1]!.avg;
      if (!best || diff > best.diff) best = { diff, q, label, hi: g[0]!, lo: g[g.length - 1]! };
    }
  if (best && best.diff >= 0.1)
    out.push({
      tone: "info",
      label: "Biggest group difference",
      title: `${best.hi.name} vs ${best.lo.name}`,
      text: `On "${short(best.q.text, 60)}", ${best.label.toLowerCase()} "${best.hi.name}" scored ${Math.round(best.diff * 100)} points higher than "${best.lo.name}" (out of 100; ${best.hi.n} and ${best.lo.n} people).`,
    });
  if (quality.total >= 5)
    out.push({
      tone: quality.flagged / quality.total > 0.15 ? "warn" : "good",
      label: "Data quality",
      title: `${pct(quality.total - quality.flagged, quality.total)}% passed quality checks`,
      text: `${quality.flagged} of ${quality.total} responses failed the attention check or were too fast.`,
    });
  return out;
}

// ---------- key drivers ----------

export function defaultOutcome(questions: AQ[]) {
  const nq = questions.filter(isNumQ);
  return (nq.find((q) => /overall|recommend|satisf/i.test(q.text)) ?? nq[nq.length - 1])?.id ?? null;
}

/** How strongly each other number/scale question moves with the outcome (Pearson r, needs 5+ paired answers). */
export function drivers(questions: AQ[], rows: ARow[], outId: string) {
  const out = questions.find((q) => q.id === outId);
  if (!out) return [];
  return questions
    .filter((q) => isNumQ(q) && q.id !== outId)
    .map((q) => {
      const xs: number[] = [],
        ys: number[] = [];
      for (const r of rows) {
        const a = scoreOf(q, r.answers[q.id]),
          b = scoreOf(out, r.answers[out.id]);
        if (a != null && b != null) {
          xs.push(a);
          ys.push(b);
        }
      }
      const c = xs.length >= 5 ? STAT.corr(xs, ys) : null;
      return { q, r: c?.r ?? null, p: c?.p ?? null, n: xs.length };
    })
    .sort((a, b) => (b.r == null ? -1 : Math.abs(b.r)) - (a.r == null ? -1 : Math.abs(a.r)));
}
export const strength = (r: number) => {
  const a = Math.abs(r);
  return a >= 0.5 ? "Strong" : a >= 0.3 ? "Moderate" : a >= 0.1 ? "Weak" : "No clear link";
};

// ---------- group comparisons and tests ----------

/** Compares a number/scale question across groups (Welch's t-test for two groups, ANOVA for more). Small groups are left out. */
export function compareGroups(q: AQ, rows: ARow[], key: string) {
  const { groups, hiddenGroups, hiddenPeople } = safeGroups(rows, key);
  const data = groups
    .map(([name, rs]) => ({
      name,
      values: rs.map((r) => scoreOf(q, r.answers[q.id])).filter((x): x is number => x != null),
    }))
    .filter((g) => g.values.length >= MIN_GROUP);
  const described = data.map((g) => ({ name: g.name, ...STAT.describe(g.values) }));
  let test:
    | { kind: "welch"; t: number; df: number; p: number; d: number }
    | { kind: "anova"; F: number; d1: number; d2: number; p: number; eta2: number }
    | null = null;
  if (data.length === 2) {
    const w = STAT.welch(data[0]!.values, data[1]!.values);
    test = w && { kind: "welch", ...w };
  } else if (data.length > 2) {
    const a = STAT.anova(data.map((g) => g.values));
    test = a && { kind: "anova", ...a };
  }
  return { groups: described, test, hiddenGroups, hiddenPeople };
}

/** Cross-tabulation with a chi-square test. Rows and columns with fewer than MIN_GROUP people are left out. */
export function crosstab(rows: ARow[], rowKey: string, colKey: string) {
  const R = safeGroups(rows, rowKey).groups.map(([n]) => n);
  const C = safeGroups(rows, colKey).groups.map(([n]) => n);
  const table = R.map((rv) =>
    C.map((cv) => rows.filter((r) => segValue(r, rowKey) === rv && segValue(r, colKey) === cv).length),
  );
  const ok = R.length >= 2 && C.length >= 2 && table.flat().some((x) => x > 0);
  return { rowLabels: R, colLabels: C, table, test: ok ? STAT.chiSquare(table) : null };
}

export function correlation(qa: AQ, qb: AQ, rows: ARow[]) {
  const xs: number[] = [],
    ys: number[] = [];
  for (const r of rows) {
    const a = scoreOf(qa, r.answers[qa.id]),
      b = scoreOf(qb, r.answers[qb.id]);
    if (a != null && b != null) {
      xs.push(a);
      ys.push(b);
    }
  }
  return STAT.corr(xs, ys);
}

/** Cronbach's alpha for a set of scale questions, using people who answered all of them. */
export function reliability(items: AQ[], rows: ARow[]) {
  const M = rows
    .map((r) => items.map((q) => scoreOf(q, r.answers[q.id])))
    .filter((row): row is number[] => row.every((x) => x != null));
  return { alpha: STAT.cronbach(M), n: M.length, k: items.length };
}

// ---------- response quality (Phase 1 responseQuality) ----------

export function responseQuality(questions: AQ[], r: ARow) {
  const flags: string[] = [];
  let score = 100;
  if (r.passedAttention === false) {
    flags.push("Failed the attention check");
    score -= 40;
  }
  if (r.speeder) {
    flags.push("Finished much faster than expected");
    score -= 30;
  }
  const sv = questions
    .filter(isScaleQ)
    .map((q) => normScore(q, r.answers[q.id]))
    .filter((x): x is number => x != null);
  if (sv.length >= 4 && new Set(sv.map((v) => v.toFixed(2))).size === 1) {
    flags.push("Gave the same answer to every scale question");
    score -= 25;
  }
  const texts = questions
    .filter((q) => q.type === "TEXT")
    .map((q) => String(r.answers[q.id] ?? "").trim())
    .filter(Boolean);
  const junk = texts.filter(
    (t) =>
      t.length < 3 ||
      /^(.)\1+$/i.test(t) ||
      !/[aeiouy]/i.test(t) ||
      /^(n\/?a|none|nothing|no|idk|ok|asdf\w*)$/i.test(t),
  ).length;
  if (junk) {
    flags.push(`${junk} very short or meaningless written answer${junk > 1 ? "s" : ""}`);
    score -= Math.min(20, junk * 10);
  }
  const answered = questions.filter((q) => {
    const v = r.answers[q.id];
    return v != null && v !== "" && !(Array.isArray(v) && !v.length);
  }).length;
  if (questions.length >= 4 && answered / questions.length < 0.6) {
    flags.push("Skipped many questions");
    score -= 10;
  }
  return { score: Math.max(0, score), flags };
}

/** Plain-language reading of a p-value. */
export const significance = (p: number) => (p < 0.001 ? "p < .001" : `p = ${p.toFixed(3).replace(/^0/, "")}`);
export const isSignificant = (p: number) => p < 0.05;
