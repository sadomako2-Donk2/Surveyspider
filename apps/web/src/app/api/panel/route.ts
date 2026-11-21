import { getDb } from "@/lib/db";
import { openSurveys } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => openSurveys(req, getDb());
