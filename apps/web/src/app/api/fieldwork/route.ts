import { getDb } from "@/lib/db";
import { requestFieldwork } from "@/server/fieldwork/handlers";

export const dynamic = "force-dynamic";
export const POST = (req: Request) => requestFieldwork(req, getDb());
