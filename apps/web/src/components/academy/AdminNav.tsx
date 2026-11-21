import Link from "next/link";

const SECTIONS = [
  ["courses", "/admin/courses", "Courses"],
  ["registrations", "/admin/registrations", "Registrations"],
  ["enquiries", "/admin/enquiries", "Enquiries"],
  ["settings", "/admin/settings", "Contact details"],
  ["members", "/admin/members", "Team"],
  ["activity", "/admin/activity", "Activity"],
] as const;
export type AdminSection = (typeof SECTIONS)[number][0];

export function AdminHeader({ current }: { current: AdminSection }) {
  return (
    <div className="stack tight">
      <span className="eyebrow">Administrators only</span>
      <h1>Admin area</h1>
      <p className="muted">
        Administrators manage courses, registrations, enquiries and contact details. Survey answers stay visible only to
        each survey&apos;s owner.
      </p>
      <nav className="subtabs" aria-label="Admin sections">
        {SECTIONS.map(([key, href, label]) => (
          <Link key={key} href={href} aria-current={current === key ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function NotAllowed() {
  return (
    <main id="main" className="wrap stack">
      <h1>Only site administrators can see this page</h1>
      <p className="muted">
        If you should have access, ask an Afrimetrica owner to add you, and make sure your email address is confirmed.
      </p>
      <Link className="btn" href="/account">
        Go to My Account
      </Link>
    </main>
  );
}
