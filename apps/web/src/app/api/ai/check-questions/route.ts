import { getDb } from "@/lib/db";
import { checkQuestions } from "@/server/ai/handlers";

export const dynamic = "force-dynamic";
export const POST = (req: Request) => checkQuestions(req, getDb());
