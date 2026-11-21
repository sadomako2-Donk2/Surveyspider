import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Counts one attempt for `key` and returns true if the limit for the current window is exceeded.
 * Atomic in the database, so it holds across server processes and restarts.
 */
export async function tooMany(db: PrismaClient, key: string, max: number, windowMs: number): Promise<boolean> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + ${windowMs} * interval '1 millisecond')
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) > max;
}

/** True if `key` has already used up its limit in the current window. Doesn't count an attempt. */
export async function isLimited(db: PrismaClient, key: string, max: number): Promise<boolean> {
  const b = await db.rateLimitBucket.findUnique({ where: { key } });
  return !!b && b.resetAt > new Date() && b.count >= max;
}
