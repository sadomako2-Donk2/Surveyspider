import Link from "next/link";
import { NavLinks } from "@/components/site/NavLinks";
import { SectionNav } from "@/components/site/SectionNav";

export function Logo() {
  // The Afrimetrica sun mark (from the supplied logo, cut out on a transparent background).
  // eslint-disable-next-line @next/next/no-img-element -- a 96px brand mark; no resizing needed
  return <img className="logo-mark" src="/brand/logo-sun.webp" width={40} height={40} alt="" />;
}

// Never touches the database, so public pages stay fast and cacheable.
export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href="/">
          <Logo />
          <span className="wm">
            <b>Afrimetrica</b>
            <small>
              DATA <i>•</i> RESEARCH <i>•</i> EXECUTIVE TRAINING
            </small>
          </span>
        </Link>
        <NavLinks />
      </div>
      <SectionNav />
    </header>
  );
}
