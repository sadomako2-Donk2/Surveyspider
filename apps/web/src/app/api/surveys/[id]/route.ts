import { getDb } from "@/lib/db";
import { deleteSurvey, getMySurvey, saveSurvey } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const GET = async (req: Request, { params }: Ctx) => getMySurvey((await params).id)(req, getDb());
export const PUT = async (req: Request, { params }: Ctx) => saveSurvey((await params).id)(req, getDb());
export const DELETE = async (req: Request, { params }: Ctx) => deleteSurvey((await params).id)(req, getDb());
