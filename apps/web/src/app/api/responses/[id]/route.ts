import { getDb } from "@/lib/db";
import { reviewResponse } from "@/server/surveys/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = async (req: Request, { params }: Ctx) => reviewResponse((await params).id)(req, getDb());
