import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { CourseEditor, type EditorCourse } from "@/components/academy/CourseEditor";
import courseTemplates from "@/content/course-templates.json";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "New course · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewCourse({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  if (!(await adminPage("/admin/courses/new")).allowed) return <NotAllowed />;
  const t = courseTemplates[Number((await searchParams).template ?? -1)];
  const initial: EditorCourse = {
    title: t?.title ?? "",
    status: "DRAFT",
    level: t?.level ?? "Introductory",
    format: t?.format ?? "In person",
    duration: t?.duration ?? "",
    summary: t?.summary ?? "",
    description: t?.description ?? "",
    outcomes: (t?.outcomes ?? []).join("\n"),
    audience: t?.audience ?? "",
    certificate: true,
    sessions: [],
    registrations: 0,
  };
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="courses" />
      <CourseEditor initial={initial} />
    </main>
  );
}
