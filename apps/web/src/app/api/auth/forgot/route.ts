import { getDb } from "@/lib/db";
import { forgotPassword } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => forgotPassword(req, getDb());
