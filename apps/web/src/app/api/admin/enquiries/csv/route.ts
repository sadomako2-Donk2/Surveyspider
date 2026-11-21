import { getDb } from "@/lib/db";
import { adminEnquiriesCsv } from "@/server/enquiries/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminEnquiriesCsv(req, getDb());
