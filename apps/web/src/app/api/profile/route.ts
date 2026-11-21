import { getDb } from "@/lib/db";
import { getProfile, saveProfile } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => getProfile(req, getDb());
export const PUT = (req: Request) => saveProfile(req, getDb());
