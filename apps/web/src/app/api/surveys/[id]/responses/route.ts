import { getDb } from "@/lib/db";
import { listResponses, submitResponse } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const GET = async (req: Request, { params }: Ctx) => listResponses((await params).id)(req, getDb());
export const POST = async (req: Request, { params }: Ctx) => submitResponse((await params).id)(req, getDb());
