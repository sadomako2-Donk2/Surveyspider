import { getDb } from "@/lib/db";
import { googleStart } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => googleStart(req, getDb());
