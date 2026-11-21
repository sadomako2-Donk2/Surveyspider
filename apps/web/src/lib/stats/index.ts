// Afrimetrica statistics library. A line-for-line TypeScript port of Phase 1's STAT
// (public/index.html, between /*STAT-START*/ and /*STAT-END*/), checked against SciPy
// (tests/unit/stats.test.ts) and against the Phase 1 code itself (tests/unit/stats-parity.test.ts).
// Only types were added; the maths is unchanged.

export const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
export const variance = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
};
export const sd = (a: number[]) => Math.sqrt(variance(a));
const quant = (s: number[], p: number) => {
  if (!s.length) return NaN;
  const i = (s.length - 1) * p,
    lo = Math.floor(i),
    hi = Math.ceil(i);
  return s[lo]! + (s[hi]! - s[lo]!) * (i - lo);
};

function lgamma(x: number) {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let y = x,
    t = x + 5.5;
  t -= (x + 0.5) * Math.log(t);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j]! / ++y;
  return -t + Math.log((2.5066282746310005 * ser) / x);
}
function betacf(x: number, a: number, b: number) {
  const FP = 1e-300;
  const qab = a + b,
    qap = a + 1,
    qam = a - 1;
  let c = 1,
    d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FP) d = FP;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FP) d = FP;
    c = 1 + aa / c;
    if (Math.abs(c) < FP) c = FP;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FP) d = FP;
    c = 1 + aa / c;
    if (Math.abs(c) < FP) c = FP;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}
function ibeta(x: number, a: number, b: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(x, a, b)) / a : 1 - (bt * betacf(1 - x, b, a)) / b;
}
function gammaP(a: number, x: number) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a,
      del = sum,
      ap = a;
    for (let n = 0; n < 1000; n++) {
      ap++;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  let b = x + 1 - a,
    c = 1e300,
    d = 1 / b,
    h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

/** Two-tailed p-value for |t| with df degrees of freedom. */
export const tP = (t: number, df: number) => ibeta(df / (df + t * t), df / 2, 0.5);
/** Upper-tail p-value of an F statistic. */
export const fP = (F: number, d1: number, d2: number) => (F <= 0 ? 1 : ibeta(d2 / (d2 + d1 * F), d2 / 2, d1 / 2));
/** Upper-tail p-value of a chi-square statistic with k degrees of freedom. */
export const chiP = (x: number, k: number) => Math.max(0, 1 - gammaP(k / 2, x / 2));
/** Two-tailed critical t value. */
export function tCrit(df: number, alpha = 0.05) {
  let lo = 0,
    hi = 1000;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    if (tP(m, df) > alpha) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

export interface Description {
  n: number;
  mean: number;
  sd: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  /** 95% confidence interval for the mean */
  lo: number;
  hi: number;
}
export function describe(a: number[]): Description {
  const s = [...a].sort((x, y) => x - y),
    n = a.length,
    m = mean(a),
    sdv = sd(a),
    half = n > 1 ? (tCrit(n - 1) * sdv) / Math.sqrt(n) : NaN;
  return {
    n,
    mean: m,
    sd: sdv,
    median: quant(s, 0.5),
    q1: quant(s, 0.25),
    q3: quant(s, 0.75),
    min: s[0]!,
    max: s[n - 1]!,
    lo: m - half,
    hi: m + half,
  };
}

/** Welch's t-test for two independent groups; d is Cohen's d with the pooled SD. */
export function welch(a: number[], b: number[]) {
  const n1 = a.length,
    n2 = b.length;
  if (n1 < 2 || n2 < 2) return null;
  const v1 = variance(a),
    v2 = variance(b),
    se = Math.sqrt(v1 / n1 + v2 / n2);
  if (!se) return null;
  const t = (mean(a) - mean(b)) / se,
    df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  return { t, df, p: tP(Math.abs(t), df), d: sp ? (mean(a) - mean(b)) / sp : 0 };
}

/** One-way ANOVA; eta2 is the share of variance explained by the groups. */
export function anova(groups: number[][]) {
  const all = groups.flat(),
    gm = mean(all),
    k = groups.length,
    N = all.length;
  let ssb = 0,
    ssw = 0;
  groups.forEach((g) => {
    const m = mean(g);
    ssb += g.length * (m - gm) ** 2;
    g.forEach((x) => (ssw += (x - m) ** 2));
  });
  const d1 = k - 1,
    d2 = N - k;
  if (d1 < 1 || d2 < 1 || !ssw) return null;
  const F = ssb / d1 / (ssw / d2);
  return { F, d1, d2, p: fP(F, d1, d2), eta2: ssb / (ssb + ssw) };
}

/** Chi-square test of independence; v is Cramér's V; smallShare is the share of cells with expected count < 5. */
export function chiSquare(tab: number[][]) {
  const R = tab.length,
    C = tab[0]!.length;
  const rs = tab.map((r) => r.reduce((a, b) => a + b, 0)),
    cs = tab[0]!.map((_, j) => tab.reduce((a, r) => a + r[j]!, 0)),
    N = rs.reduce((a, b) => a + b, 0);
  let chi = 0,
    small = 0;
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++) {
      const e = (rs[i]! * cs[j]!) / N;
      if (e < 5) small++;
      if (e > 0) chi += (tab[i]![j]! - e) ** 2 / e;
    }
  const df = (R - 1) * (C - 1);
  return {
    chi,
    df,
    p: df > 0 ? chiP(chi, df) : 1,
    v: Math.sqrt(chi / (N * Math.max(1, Math.min(R - 1, C - 1)))),
    N,
    smallShare: small / (R * C),
  };
}

/** Pearson correlation with a two-tailed p-value. */
export function corr(x: number[], y: number[]) {
  const n = x.length;
  if (n < 3) return null;
  const mx = mean(x),
    my = mean(y);
  let a = 0,
    b = 0,
    c = 0;
  for (let i = 0; i < n; i++) {
    a += (x[i]! - mx) * (y[i]! - my);
    b += (x[i]! - mx) ** 2;
    c += (y[i]! - my) ** 2;
  }
  if (!b || !c) return null;
  const r = Math.max(-1, Math.min(1, a / Math.sqrt(b * c)));
  return { r, n, p: Math.abs(r) >= 1 ? 0 : tP(Math.abs(r * Math.sqrt((n - 2) / (1 - r * r))), n - 2) };
}

/** Cronbach's alpha for a respondents × items matrix. */
export function cronbach(M: number[][]) {
  if (!M.length) return null;
  const k = M[0]!.length;
  if (k < 2 || M.length < 3) return null;
  const itemVar = Array.from({ length: k }, (_, j) => variance(M.map((r) => r[j]!))).reduce((a, b) => a + b, 0);
  const totVar = variance(M.map((r) => r.reduce((a, b) => a + b, 0)));
  return totVar ? (k / (k - 1)) * (1 - itemVar / totVar) : null;
}
