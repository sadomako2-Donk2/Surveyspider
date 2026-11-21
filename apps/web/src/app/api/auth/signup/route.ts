import { getDb } from "@/lib/db";
import { signup } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => signup(req, getDb());
