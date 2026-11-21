import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { StatusSelect } from "@/components/academy/EnrollmentControls";
import { formatDates, formatFee } from "@/lib/academy";
import { getDb } from "@/lib/db";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "Registrations · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Registrations({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  if (!(await adminPage("/admin/registrations")).allowed) return <NotAllowed />;
  const db = getDb();
  const course = (await searchParams).course || "";
  const [courses, rows] = await Promise.all([
    db.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.enrollment.findMany({
      where: { courseId: course || undefined },
      include: { course: { select: { title: true } }, session: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="registrations" />
      <section className="card">
        <div className="row-between">
          <h2>Course registrations</h2>
          <div className="ctas tight">
            <form className="ctas tight">
              <label className="inline">
                Course
                <select name="course" defaultValue={course}>
                  <option value="">All courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn small" type="submit">
                Show
              </button>
            </form>
            {rows.length > 0 && (
              <a
                className="btn small"
                href={`/api/admin/registrations/csv${course ? `?course=${course}` : ""}`}
                download
              >
                Download CSV
              </a>
            )}
          </div>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="wide stack-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Person</th>
                  <th scope="col">Course and date</th>
                  <th scope="col">Notes</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="n" data-label="Date">
                      {e.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td data-label="Person">
                      <b>{e.name}</b>
                      <br />
                      <span className="hint">
                        {e.email}
                        {e.phone && ` · ${e.phone}`}
                        {e.organisation && (
                          <>
                            <br />
                            {e.organisation}
                          </>
                        )}
                      </span>
                    </td>
                    <td data-label="Course and date">
                      {e.course.title}
                      <br />
                      <span className="hint">
                        {e.session
                          ? `${formatDates(e.session.startsOn, e.session.endsOn)}${e.session.location ? `, ${e.session.location}` : ""} · ${formatFee(e.session.feeMinor, e.session.currency)}`
                          : "Interest only"}
                      </span>
                    </td>
                    <td className="hint" data-label="Notes">
                      {e.notes}
                    </td>
                    <td data-label="Status">
                      <StatusSelect id={e.id} status={e.status} label={e.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No registrations yet.</p>
        )}
      </section>
    </main>
  );
}
