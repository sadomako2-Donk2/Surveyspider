import { getDb } from "@/lib/db";
import { resendVerification } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => resendVerification(req, getDb());
