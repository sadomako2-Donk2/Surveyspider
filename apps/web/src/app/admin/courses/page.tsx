import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import courseTemplates from "@/content/course-templates.json";
import { formatDates } from "@/lib/academy";
import { getDb } from "@/lib/db";
import { listAllCoursesForAdmin, upcomingSessions } from "@/server/academy/service";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "Courses · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" } as const;

export default async function AdminCourses({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (!(await adminPage("/admin/courses")).allowed) return <NotAllowed />;
  const courses = await listAllCoursesForAdmin(getDb());
  const { deleted } = await searchParams;
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="courses" />
      {deleted && <p className="notice">Course deleted.</p>}
      <section className="card">
        <div className="row-between">
          <h2>Courses</h2>
          <form action="/admin/courses/new" className="ctas tight">
            <label className="inline">
              Start from
              <select name="template" defaultValue="">
                <option value="">A blank course</option>
                {courseTemplates.map((t, i) => (
                  <option key={t.title} value={i}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary" type="submit">
              New course
            </button>
          </form>
        </div>
        <p className="hint">
          Templates fill in a description and learning outcomes. Add your own dates, venues and fees, then publish.
        </p>
        {courses.length ? (
          <div className="table-wrap">
            <table className="wide">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Status</th>
                  <th scope="col">Next date</th>
                  <th scope="col">Registrations</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const next = upcomingSessions(c.sessions)[0];
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/admin/courses/${c.id}`}>
                          <b>{c.title}</b>
                        </Link>
                        <br />
                        <span className="hint">{[c.level, c.format, c.duration].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td>
                        <span className={`pill${c.status === "PUBLISHED" ? " live" : ""}`}>{STATUS[c.status]}</span>
                      </td>
                      <td>{next ? formatDates(next.startsOn, next.endsOn) : "—"}</td>
                      <td className="n">
                        <Link href={`/admin/registrations?course=${c.id}`}>{c._count.enrollments}</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No courses yet. Create one from a template to get started.</p>
        )}
      </section>
    </main>
  );
}
