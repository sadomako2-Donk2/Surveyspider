import { getDb } from "@/lib/db";
import { createSurvey, listMySurveys } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => listMySurveys(req, getDb());
export const POST = (req: Request) => createSurvey(req, getDb());
