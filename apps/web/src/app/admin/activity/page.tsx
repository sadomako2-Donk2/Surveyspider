import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { getDb } from "@/lib/db";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "Activity · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const ACTION: Record<string, string> = {
  "user.signup": "Created an account",
  "user.signup_google": "Created an account with Google",
  "user.password_reset": "Reset their password",
  "membership.grant_from_env": "Became an admin (ADMIN_EMAILS)",
  "membership.add": "Added a team member",
  "membership.role": "Changed a team member's role",
  "membership.remove": "Removed a team member",
  "membership.leave": "Left the team",
  "course.create": "Created a course",
  "course.update": "Edited a course",
  "course.published": "Published a course",
  "course.draft": "Moved a course to draft",
  "course.archived": "Archived a course",
  "course.delete": "Deleted a course",
  "enrollment.status": "Changed a registration's status",
  "enrollment.cancel": "Cancelled their registration",
  "enrollment.export": "Downloaded registrations",
  "enquiry.status": "Changed an enquiry's status",
  "enquiry.export": "Downloaded enquiries",
  "settings.contact": "Changed the contact details",
};

function detail(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const m = meta as Record<string, unknown>;
  if (typeof m.title === "string") return m.title;
  if (typeof m.from === "string" && typeof m.to === "string") return `${m.from} → ${m.to}`;
  if (typeof m.rows === "number") return `${m.rows} rows`;
  if (typeof m.role === "string") return m.role;
  return "";
}

export default async function Activity() {
  if (!(await adminPage("/admin/activity")).allowed) return <NotAllowed />;
  const db = getDb();
  const events = await db.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const ids = [...new Set(events.map((e) => e.actorId).filter((x): x is string => !!x))];
  const people = new Map(
    (await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true } })).map((u) => [
      u.id,
      u.name || u.email,
    ]),
  );
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="activity" />
      <section className="card">
        <div>
          <h2>Activity</h2>
          <p className="muted">The latest 200 actions. This log can&apos;t be edited or deleted.</p>
        </div>
        {events.length ? (
          <div className="table-wrap">
            <table className="wide stack-table">
              <thead>
                <tr>
                  <th scope="col">When (UTC)</th>
                  <th scope="col">Who</th>
                  <th scope="col">What</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td data-label="When (UTC)" className="n">
                      {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td data-label="Who">{e.actorId ? (people.get(e.actorId) ?? "Deleted account") : "System"}</td>
                    <td data-label="What">{ACTION[e.action] ?? e.action}</td>
                    <td data-label="Detail" className="hint">
                      {detail(e.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Nothing recorded yet.</p>
        )}
      </section>
    </main>
  );
}
