import { getDb } from "@/lib/db";
import { setSurveyStatus } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const POST = async (req: Request, { params }: Ctx) => setSurveyStatus((await params).id)(req, getDb());
