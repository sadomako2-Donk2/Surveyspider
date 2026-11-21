import { getDb } from "@/lib/db";
import { adminUpdateFieldwork } from "@/server/fieldwork/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = async (req: Request, { params }: Ctx) => adminUpdateFieldwork((await params).id)(req, getDb());
