import { getDb } from "@/lib/db";
import { adminDeleteCourse, adminUpdateCourse } from "@/server/academy/handlers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PUT = async (req: Request, { params }: Ctx) => adminUpdateCourse((await params).id)(req, getDb());
export const DELETE = async (req: Request, { params }: Ctx) => adminDeleteCourse((await params).id)(req, getDb());
