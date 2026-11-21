import Link from "next/link";

export function AdminHeader({ current }: { current: "courses" | "registrations" }) {
  return (
    <div className="stack tight">
      <span className="eyebrow">Administrators only</span>
      <h1>Admin area</h1>
      <p className="muted">
        Administrators see registrations and course details. Survey answers stay visible only to each survey&apos;s
        owner.
      </p>
      <nav className="subtabs" aria-label="Admin sections">
        <Link href="/admin/courses" aria-current={current === "courses" ? "page" : undefined}>
          Courses
        </Link>
        <Link href="/admin/registrations" aria-current={current === "registrations" ? "page" : undefined}>
          Registrations
        </Link>
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
