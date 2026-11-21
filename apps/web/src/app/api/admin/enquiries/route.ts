import { getDb } from "@/lib/db";
import { adminListEnquiries } from "@/server/enquiries/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminListEnquiries(req, getDb());
