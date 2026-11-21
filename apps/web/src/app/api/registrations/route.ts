import { getDb } from "@/lib/db";
import { myEnrollments, register } from "@/server/academy/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => myEnrollments(req, getDb());
export const POST = (req: Request) => register(req, getDb());
