import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { CourseEditor } from "@/components/academy/CourseEditor";
import { isoDay } from "@/lib/academy";
import { getDb } from "@/lib/db";
import { getCourseById } from "@/server/academy/service";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "Edit course · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditCourse({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  if (!(await adminPage(`/admin/courses/${id}`)).allowed) return <NotAllowed />;
  const c = await getCourseById(getDb(), id);
  if (!c) notFound();
  const { saved } = await searchParams;
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="courses" />
      {saved && <p className="notice">Course created.</p>}
      <CourseEditor
        initial={{
          id: c.id,
          slug: c.slug,
          title: c.title,
          status: c.status,
          level: c.level,
          format: c.format,
          duration: c.duration,
          summary: c.summary,
          description: c.description,
          outcomes: c.outcomes.join("\n"),
          audience: c.audience,
          certificate: c.certificate,
          registrations: c.sessions.reduce((a, s) => a + s.taken, 0),
          sessions: c.sessions.map((s) => ({
            key: s.id,
            id: s.id,
            startsOn: isoDay(s.startsOn),
            endsOn: isoDay(s.endsOn),
            location: s.location,
            seats: String(s.seats),
            fee: s.feeMinor ? (s.feeMinor / 100).toFixed(s.feeMinor % 100 ? 2 : 0) : "0",
            currency: s.currency,
            taken: s.taken,
          })),
        }}
      />
    </main>
  );
}
