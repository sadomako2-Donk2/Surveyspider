import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="wrap stack">
      <span className="eyebrow">Page not found</span>
      <h1>We couldn&apos;t find that page</h1>
      <p className="muted">It may have moved while we update the site.</p>
      <div className="ctas">
        <Link className="btn primary" href="/">
          Go to the home page
        </Link>
        <Link className="btn" href="/resources">
          Browse resources
        </Link>
      </div>
    </main>
  );
}
