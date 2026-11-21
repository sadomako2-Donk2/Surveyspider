// Sample size for estimating a proportion, with the finite population correction.
// n0 = z² p (1 − p) / e²;  n = n0 / (1 + (n0 − 1) / N)  when the population N is known.

export const CONFIDENCE = [
  { label: "90%", z: 1.645 },
  { label: "95%", z: 1.96 },
  { label: "99%", z: 2.576 },
] as const;

export function sampleSize(z: number, marginOfError: number, population = 0, p = 0.5): number {
  if (!(z > 0) || !(marginOfError > 0 && marginOfError < 1) || !(p > 0 && p < 1)) return NaN;
  const n0 = (z * z * p * (1 - p)) / (marginOfError * marginOfError);
  return Math.ceil(population > 0 ? n0 / (1 + (n0 - 1) / population) : n0);
}

/** People to invite so that `needed` complete the survey at the expected response rate (0–1]. */
export function invitations(needed: number, responseRate: number): number {
  return Math.ceil(needed / Math.min(1, Math.max(0.01, responseRate)));
}
