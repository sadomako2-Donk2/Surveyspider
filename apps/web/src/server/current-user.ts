import "server-only";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { userFromCookieHeader } from "./auth/session";

/** The signed-in user for the current page request (server components only). */
export async function getCurrentUser() {
  const jar = await cookies();
  const header = jar
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join("; ");
  return userFromCookieHeader(getDb(), header);
}
