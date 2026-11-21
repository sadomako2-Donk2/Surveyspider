import { getDb } from "@/lib/db";
import { readQuestionnaire } from "@/server/ai/handlers";

export const dynamic = "force-dynamic";
export const POST = (req: Request) => readQuestionnaire(req, getDb());
