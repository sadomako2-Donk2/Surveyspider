import { getDb } from "@/lib/db";
import { removeMember, updateMember } from "@/server/auth/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ slug: string; id: string }> };

export const PATCH = async (req: Request, { params }: Ctx) => {
  const { slug, id } = await params;
  return updateMember(slug, id)(req, getDb());
};
export const DELETE = async (req: Request, { params }: Ctx) => {
  const { slug, id } = await params;
  return removeMember(slug, id)(req, getDb());
};
