import { getDb } from "@/lib/db";
import { adminSaveContactSettings } from "@/server/enquiries/handlers";

export const dynamic = "force-dynamic";
export const PUT = (req: Request) => adminSaveContactSettings(req, getDb());
