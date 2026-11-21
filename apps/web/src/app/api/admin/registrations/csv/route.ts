import { getDb } from "@/lib/db";
import { adminEnrollmentsCsv } from "@/server/academy/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminEnrollmentsCsv(req, getDb());
