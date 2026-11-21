import { getDb } from "@/lib/db";
import { updateEnrollment } from "@/server/academy/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = async (req: Request, { params }: Ctx) => updateEnrollment((await params).id)(req, getDb());
