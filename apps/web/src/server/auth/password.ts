import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: string, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(pw, salt, len, opts, (e, key) => (e ? reject(e) : resolve(key))));

// Stored as scrypt$N$r$p$<salt>$<hex hash>. The salt string is used as-is (UTF-8), which also matches
// Phase 1's format (16-byte hex salt, N=16384, r=8, p=1, 64-byte key), so imported accounts keep their passwords.
const N = 16384,
  R = 8,
  P = 1,
  KEYLEN = 64;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < PASSWORD_MIN || pw.length > PASSWORD_MAX)
    return `Use a password of at least ${PASSWORD_MIN} characters.`;
  return null;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(pw, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt}$${key.toString("hex")}`;
}

/** Builds the stored form of a Phase 1 hash (used by the step-9 import). */
export const fromPhase1 = (salt: string, passHash: string) => `scrypt$${N}$${R}$${P}$${salt}$${passHash}`;

export async function verifyPassword(pw: string, stored: string | null | undefined): Promise<boolean> {
  const parts = (stored ?? "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const salt = parts[4]!,
    expected = Buffer.from(parts[5]!, "hex");
  if (!(n >= 1024 && n <= 1 << 20 && r >= 1 && r <= 32 && p >= 1 && p <= 16) || expected.length < 32) return false;
  const key = await scrypt(pw, salt, expected.length, { N: n, r, p, maxmem: 256 * n * r + 1024 * 1024 });
  return timingSafeEqual(key, expected);
}
