import { getDb } from "@/lib/db";
import { verifyEmail } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => verifyEmail(req, getDb());
