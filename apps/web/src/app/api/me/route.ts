import { getDb } from "@/lib/db";
import { me } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => me(req, getDb());
