import "server-only";
import type { PrismaClient, Role, User } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { AFRIMETRICA_ORG } from "../../../prisma/seed-lib";
import { authConfig } from "../config";
import { audit } from "../audit";

export const ROLES: Role[] = ["OWNER", "ADMIN", "ANALYST", "MEMBER"];
const RANK: Record<Role, number> = { OWNER: 4, ADMIN: 3, ANALYST: 2, MEMBER: 1 };

export const atLeast = (role: Role | null | undefined, min: Role) => !!role && RANK[role] >= RANK[min];

export async function roleIn(db: PrismaClient, userId: string, organisationId: string): Promise<Role | null> {
  const m = await db.membership.findUnique({ where: { userId_organisationId: { userId, organisationId } } });
  return m?.role ?? null;
}

/**
 * The Afrimetrica organisation, created on first use. Two requests can try to create it at the same
 * moment; the loser of that race simply reads the one the other created.
 */
export async function afrimetricaOrg(db: PrismaClient) {
  try {
    return await db.organisation.upsert({
      where: { slug: AFRIMETRICA_ORG.slug },
      update: {},
      create: { ...AFRIMETRICA_ORG },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return db.organisation.findUniqueOrThrow({ where: { slug: AFRIMETRICA_ORG.slug } });
    throw e;
  }
}

/** Site administrators are owners and admins of the Afrimetrica organisation. */
export async function isSiteAdmin(db: PrismaClient, userId: string): Promise<boolean> {
  const m = await db.membership.findFirst({
    where: { userId, organisation: { slug: AFRIMETRICA_ORG.slug }, role: { in: ["OWNER", "ADMIN"] } },
  });
  return !!m;
}

/**
 * Accounts whose email is listed in ADMIN_EMAILS become admins of the Afrimetrica organisation,
 * but only once the email address is confirmed (otherwise anyone could sign up with that address first).
 */
export async function grantAdminFromEnv(db: PrismaClient, user: User): Promise<void> {
  if (!user.emailVerifiedAt || !authConfig().adminEmails.includes(user.email)) return;
  const org = await afrimetricaOrg(db);
  const role = await roleIn(db, user.id, org.id);
  if (atLeast(role, "ADMIN")) return;
  try {
    await db.membership.upsert({
      where: { userId_organisationId: { userId: user.id, organisationId: org.id } },
      update: { role: "ADMIN" },
      create: { userId: user.id, organisationId: org.id, role: "ADMIN" },
    });
  } catch (e) {
    // Same person signing in twice at once: the membership already exists, which is what we wanted.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    return;
  }
  await audit(db, {
    actorId: null,
    organisationId: org.id,
    action: "membership.grant_from_env",
    entityType: "User",
    entityId: user.id,
    metadata: { role: "ADMIN", source: "ADMIN_EMAILS" },
  });
}

export class RoleError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Rules for managing members:
 * - admins and owners can see and manage members; analysts and members can't
 * - only owners can make someone an owner or admin, or change/remove an owner or admin
 * - the last owner can't be removed or demoted
 * - anyone can leave an organisation (unless they're the last owner)
 */
export async function assertCanManage(
  db: PrismaClient,
  actorId: string,
  organisationId: string,
  target: { userId: string; role: Role } | null,
  newRole: Role | null,
) {
  const actorRole = await roleIn(db, actorId, organisationId);
  const leaving = target && target.userId === actorId && newRole === null;
  if (!leaving && !atLeast(actorRole, "ADMIN"))
    throw new RoleError(403, "Only organisation admins and owners can manage members.");
  const touchesSenior = (target && atLeast(target.role, "ADMIN")) || (newRole && atLeast(newRole, "ADMIN"));
  if (!leaving && touchesSenior && actorRole !== "OWNER")
    throw new RoleError(403, "Only owners can add, change or remove owners and admins.");
  if (target?.role === "OWNER" && newRole !== "OWNER") {
    const owners = await db.membership.count({ where: { organisationId, role: "OWNER" } });
    if (owners <= 1)
      throw new RoleError(409, "An organisation needs at least one owner. Make someone else an owner first.");
  }
}
