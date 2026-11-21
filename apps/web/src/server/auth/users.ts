import "server-only";
import type { PrismaClient, User } from "@/generated/prisma/client";
import { emailEnabled, googleEnabled } from "../config";
import { isSiteAdmin } from "./roles";

export const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  verified: !!u.emailVerifiedAt,
  google: !!u.googleSubject,
  password: !!u.passwordHash,
});
export type PublicUser = ReturnType<typeof publicUser>;

/** Email confirmation is only required when the site can actually send emails. */
export const needsVerification = (u: User | null) => !!u && !u.emailVerifiedAt && emailEnabled();

export async function meResponse(db: PrismaClient, u: User | null) {
  const auth = { google: googleEnabled(), emailReset: emailEnabled() };
  if (!u) return { user: null, needsVerification: false, isSiteAdmin: false, memberships: [], auth };
  const memberships = await db.membership.findMany({
    where: { userId: u.id },
    include: { organisation: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return {
    user: publicUser(u),
    needsVerification: needsVerification(u),
    isSiteAdmin: await isSiteAdmin(db, u.id),
    memberships: memberships.map((m) => ({ organisation: m.organisation, role: m.role })),
    auth,
  };
}
