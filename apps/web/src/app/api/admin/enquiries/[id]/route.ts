import { getDb } from "@/lib/db";
import { adminUpdateEnquiry } from "@/server/enquiries/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = async (req: Request, { params }: Ctx) => adminUpdateEnquiry((await params).id)(req, getDb());
