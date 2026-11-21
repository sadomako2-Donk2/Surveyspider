import { getDb } from "@/lib/db";
import { addMember, listMembers } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ slug: string }> };

export const GET = async (req: Request, { params }: Ctx) => listMembers((await params).slug)(req, getDb());
export const POST = async (req: Request, { params }: Ctx) => addMember((await params).slug)(req, getDb());
