import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResendVerification, SignOutButton } from "@/components/auth/AccountActions";
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
  const me = await meResponse(getDb(), user);
  const u = me.user!;
  const first = u.name.trim().split(/\s+/)[0];
  return (
    <main className="wrap stack">
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
      <p className="hint">
        Your courses, surveys and enquiries will appear here as those parts of the new site are built.
      </p>
    </main>
  );
}
