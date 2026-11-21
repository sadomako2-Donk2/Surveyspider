import { getDb } from "@/lib/db";
import { myEnquiries, sendEnquiry } from "@/server/enquiries/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => myEnquiries(req, getDb());
export const POST = (req: Request) => sendEnquiry(req, getDb());
