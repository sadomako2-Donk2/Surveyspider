import { getDb } from "@/lib/db";
import { adminFieldworkCsv } from "@/server/fieldwork/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminFieldworkCsv(req, getDb());
