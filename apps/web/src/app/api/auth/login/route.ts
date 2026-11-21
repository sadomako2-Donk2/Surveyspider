import { getDb } from "@/lib/db";
import { login } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => login(req, getDb());
