import Link from "next/link";
import { NAV } from "@/lib/site";

export function Logo() {
  return (
    <svg className="logo-mark" width="40" height="40" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="afGold" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#a87a22" />
          <stop offset="0.55" stopColor="#f2d27e" />
          <stop offset="1" stopColor="#c4952f" />
        </linearGradient>
      </defs>
      <path
        className="af-a"
        d="M6 43 21.2 7.6a3 3 0 0 1 5.6 0L42 43"
        fill="none"
        strokeWidth="6.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 32.5 21 28.5l5 2.2 9.8-8.6"
        fill="none"
        stroke="url(#afGold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38.6" cy="19.6" r="3.6" fill="#f2d27e" className="af-dot" />
    </svg>
  );
}

// Static on purpose: the header never touches the database, so public pages stay fast and cacheable.
export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href="/" aria-label="Afrimetrica home">
          <Logo />
          <span className="wm">
            <b>
              AFRI<span className="gold-text">METRICA</span>
            </b>
            <small>RESEARCH METHODS &amp; ANALYTICS</small>
          </span>
        </Link>
        <nav className="tabs" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
