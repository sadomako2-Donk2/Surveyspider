import "server-only";
import type { PrismaClient, User } from "@/generated/prisma/client";
import { fail } from "../http";
import { isSiteAdmin } from "./roles";
import { currentUser } from "./session";
import { needsVerification } from "./users";

type Guarded = { user: User; error?: undefined } | { user?: undefined; error: Response };

export async function requireUser(db: PrismaClient, req: Request): Promise<Guarded> {
  const user = await currentUser(db, req);
  return user ? { user } : { error: fail(401, "auth_required", "Sign in first.") };
}

export async function requireVerified(db: PrismaClient, req: Request, doing = "continue"): Promise<Guarded> {
  const r = await requireUser(db, req);
  if (r.error) return r;
  if (needsVerification(r.user))
    return {
      error: fail(403, "verify_required", `Confirm your email address to ${doing}. We sent a link to ${r.user.email}.`),
    };
  return r;
}

/** Site administrators: owners and admins of the Afrimetrica organisation, with a confirmed email. */
export async function requireSiteAdmin(db: PrismaClient, req: Request): Promise<Guarded> {
  const r = await requireVerified(db, req);
  if (r.error) return r;
  if (!(await isSiteAdmin(db, r.user.id)))
    return { error: fail(403, "forbidden", "Only site administrators can do this.") };
  return r;
}
