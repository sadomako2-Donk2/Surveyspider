import "server-only";
import type { PrismaClient, User } from "@/generated/prisma/client";
import { SESSION_COOKIE, SESSION_DAYS } from "../config";
import { cookie, parseCookies, randomToken, sha256 } from "../http";

/** Starts a session and returns the Set-Cookie header value. */
export async function startSession(db: PrismaClient, req: Request, userId: string): Promise<string> {
  const token = randomToken();
  await db.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5),
      userAgent: (req.headers.get("user-agent") ?? "").slice(0, 200),
    },
  });
  return cookie(req, SESSION_COOKIE, token, SESSION_DAYS * 86400);
}

export const clearSessionCookie = (req: Request) => cookie(req, SESSION_COOKIE, "", 0);

export function sessionToken(cookieHeader: string | null | undefined): string | null {
  const t = parseCookies(cookieHeader)[SESSION_COOKIE];
  return t && /^[0-9a-f]{64}$/.test(t) ? t : null;
}

/** The signed-in user for a Cookie header, or null. Expired sessions are removed. */
export async function userFromCookieHeader(
  db: PrismaClient,
  cookieHeader: string | null | undefined,
): Promise<User | null> {
  const token = sessionToken(cookieHeader);
  if (!token) return null;
  const s = await db.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!s) return null;
  if (s.expiresAt < new Date()) {
    await db.session.deleteMany({ where: { id: s.id } });
    return null;
  }
  if (Date.now() - s.lastSeenAt.getTime() > 3600e3)
    await db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return s.user;
}

export const currentUser = (db: PrismaClient, req: Request) => userFromCookieHeader(db, req.headers.get("cookie"));

export async function endSession(db: PrismaClient, req: Request) {
  const token = sessionToken(req.headers.get("cookie"));
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
}
