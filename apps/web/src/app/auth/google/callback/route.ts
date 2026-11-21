import { getDb } from "@/lib/db";
import { googleCallback } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => googleCallback(req, getDb());
