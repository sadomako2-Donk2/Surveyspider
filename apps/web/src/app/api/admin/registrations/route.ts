import { getDb } from "@/lib/db";
import { adminListEnrollments } from "@/server/academy/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminListEnrollments(req, getDb());
