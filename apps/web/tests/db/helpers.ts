import "dotenv/config";
import { createPrisma } from "@/lib/db";

export const db = createPrisma(process.env.TEST_DATABASE_URL);

let n = 0;
export const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;
export const newUser = (label = "user") => db.user.create({ data: { email: `${uniq(label)}@example.com` } });

/** Resolves to the database error message, or "" if the operation succeeded. */
export async function failure(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "";
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
