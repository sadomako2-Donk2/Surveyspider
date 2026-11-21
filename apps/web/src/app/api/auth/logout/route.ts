import { getDb } from "@/lib/db";
import { logout } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => logout(req, getDb());
