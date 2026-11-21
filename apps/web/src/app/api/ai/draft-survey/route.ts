import { getDb } from "@/lib/db";
import { draftSurvey } from "@/server/ai/handlers";

export const dynamic = "force-dynamic";
export const POST = (req: Request) => draftSurvey(req, getDb());
