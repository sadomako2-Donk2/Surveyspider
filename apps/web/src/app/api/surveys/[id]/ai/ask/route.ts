import { getDb } from "@/lib/db";
import { askAnalyst } from "@/server/ai/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Owner only: the survey is loaded with the owner check in the query, so others get "not found". */
export const POST = async (req: Request, { params }: Ctx) => askAnalyst((await params).id)(req, getDb());
