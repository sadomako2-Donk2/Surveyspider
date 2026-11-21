import { getDb } from "@/lib/db";
import { publishSurvey } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const POST = async (req: Request, { params }: Ctx) => publishSurvey((await params).id)(req, getDb());
