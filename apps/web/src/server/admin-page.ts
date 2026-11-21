import "server-only";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { isSiteAdmin } from "./auth/roles";
import { needsVerification } from "./auth/users";
import { getCurrentUser } from "./current-user";

/** For admin pages: the signed-in site administrator, or a redirect / "not allowed" result. Call in every admin page. */
export async function adminPage(path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(path)}`);
  if (needsVerification(user) || !(await isSiteAdmin(getDb(), user.id))) return { user, allowed: false as const };
  return { user, allowed: true as const };
}
