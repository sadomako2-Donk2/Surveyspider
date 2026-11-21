import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CancelRegistration } from "@/components/academy/EnrollmentControls";
import { ResendVerification, SignOutButton } from "@/components/auth/AccountActions";
import { ENROLLMENT_LABEL, formatDates } from "@/lib/academy";
import { ENQUIRY_STATUS_FOR_SENDER, ENQUIRY_TYPE_LABEL } from "@/lib/enquiries";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/server/current-user";
import { meResponse } from "@/server/auth/users";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };
export const dynamic = "force-dynamic";

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", ANALYST: "Analyst", MEMBER: "Member" } as const;

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/account");
  const q = await searchParams;
  const db = getDb();
  const me = await meResponse(db, user);
  const enquiries = await db.enquiry.findMany({
    where: { requesterId: user.id },
    select: { id: true, type: true, status: true, service: true, subject: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const fieldwork = await db.fieldworkRequest.findMany({
    where: { requesterId: user.id },
    select: { id: true, ref: true, status: true, quoteTotalUsd: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    include: { course: { select: { title: true, slug: true, status: true } }, session: true },
    orderBy: { createdAt: "desc" },
  });
  const u = me.user!;
  const first = u.name.trim().split(/\s+/)[0];
  return (
    <main id="main" className="wrap stack">
      {q.password === "updated" && <p className="notice">Password updated. You&apos;re signed in.</p>}
      {q.signed_in === "google" && <p className="notice">Signed in with Google.</p>}
      {me.needsVerification && (
        <p className="notice warn">
          <b>Confirm your email address.</b> We sent a link to {u.email}. <ResendVerification email={u.email} />
        </p>
      )}
      <div>
        <span className="eyebrow">My Account</span>
        <h1>{first ? `Hello, ${first}` : "Your account"}</h1>
      </div>
      <div className="grid2">
        <section className="card">
          <h2>Profile</h2>
          <dl className="kv">
            <dt>Name</dt>
            <dd>{u.name || "—"}</dd>
            <dt>Email</dt>
            <dd>{u.email}</dd>
            <dt>Sign-in</dt>
            <dd>{[u.password && "Email and password", u.google && "Google"].filter(Boolean).join(" · ")}</dd>
            <dt>Email status</dt>
            <dd>{u.verified ? "Confirmed" : "Not confirmed yet"}</dd>
          </dl>
          <div>
            <SignOutButton />
          </div>
        </section>
        <section className="card">
          <h2>Organisations</h2>
          {me.memberships.length ? (
            <ul className="plain">
              {me.memberships.map((m) => (
                <li key={m.organisation.slug}>
                  <b>{m.organisation.name}</b> <span className="pill">{ROLE_LABEL[m.role]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">You&apos;re not a member of any organisation yet.</p>
          )}
          {me.isSiteAdmin && <p className="hint">You&apos;re an Afrimetrica site administrator.</p>}
        </section>
      </div>
      <section className="card">
        <div className="row-between">
          <h2>My courses</h2>
          <Link className="btn small" href="/training">
            Browse courses
          </Link>
        </div>
        {enrollments.length ? (
          <div className="table-wrap">
            <table className="wide stack-table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Dates</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Course">
                      {e.course.status === "PUBLISHED" ? (
                        <Link href={`/training/${e.course.slug}`}>{e.course.title}</Link>
                      ) : (
                        e.course.title
                      )}
                    </td>
                    <td data-label="Dates">
                      {e.session ? formatDates(e.session.startsOn, e.session.endsOn) : "Dates to be announced"}
                    </td>
                    <td data-label="Status">
                      <span className={`pill${e.status === "CONFIRMED" || e.status === "COMPLETED" ? " live" : ""}`}>
                        {ENROLLMENT_LABEL[e.status]}
                      </span>
                    </td>
                    <td>
                      {(e.status === "REGISTERED" || e.status === "INTEREST") && <CancelRegistration id={e.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">You haven&apos;t registered for a course yet.</p>
        )}
      </section>
      {me.isSiteAdmin && (
        <p>
          <Link className="btn gold" href="/admin">
            Open the admin area
          </Link>
        </p>
      )}
      <section className="card">
        <h2>My enquiries</h2>
        {enquiries.length || fieldwork.length ? (
          <div className="table-wrap">
            <table className="wide stack-table">
              <thead>
                <tr>
                  <th scope="col">Sent</th>
                  <th scope="col">About</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {fieldwork.map((f) => (
                  <tr key={f.id}>
                    <td data-label="Sent" className="n">
                      {f.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td data-label="About">
                      Paper survey fieldwork · {f.ref} · US${f.quoteTotalUsd.toLocaleString("en-US")}
                    </td>
                    <td data-label="Status">
                      <span className="pill">
                        {
                          {
                            NEW: "Received",
                            CONTACTED: "We've been in touch",
                            QUOTED: "Final quote sent",
                            WON: "Agreed",
                            LOST: "Closed",
                          }[f.status]
                        }
                      </span>
                    </td>
                  </tr>
                ))}
                {enquiries.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Sent" className="n">
                      {e.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td data-label="About">
                      {[ENQUIRY_TYPE_LABEL[e.type], e.service || e.subject].filter(Boolean).join(" · ")}
                    </td>
                    <td data-label="Status">
                      <span className="pill">{ENQUIRY_STATUS_FOR_SENDER[e.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No enquiries yet. Ask us about <Link href="/consultancy">consultancy</Link>,{" "}
            <Link href="/analytics">analysis</Link> or <Link href="/training">training</Link>.
          </p>
        )}
      </section>
      <p className="hint">Your surveys will appear here when the survey tools move to the new site.</p>
    </main>
  );
}
