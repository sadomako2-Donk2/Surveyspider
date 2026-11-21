import "server-only";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "../current-user";
import { loadSurvey } from "./service";

/** Survey owner pages: the signed-in user and their survey, or a redirect / null when it isn't theirs. */
export async function ownerPage(id: string, path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(path)}`);
  const survey = await loadSurvey(getDb(), id);
  return { user, survey: survey && survey.ownerId === user.id ? survey : null };
}

export async function signedInPage(path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(path)}`);
  return user;
}
