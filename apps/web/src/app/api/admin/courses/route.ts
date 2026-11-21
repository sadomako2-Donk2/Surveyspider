import { getDb } from "@/lib/db";
import { adminCreateCourse, adminListCourses } from "@/server/academy/handlers";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => adminListCourses(req, getDb());
export const POST = (req: Request) => adminCreateCourse(req, getDb());
