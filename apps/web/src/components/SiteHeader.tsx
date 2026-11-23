import Link from "next/link";
import { NavLinks } from "@/components/site/NavLinks";
import { SectionNav } from "@/components/site/SectionNav";

export function Logo() {
  // The original Afrimetrica logo, cropped to its content; its navy matches the header's background.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small, pre-sized brand image; no resizing needed
    <img
      className="logo-header"
      src="/brand/logo-header.webp"
      width={211}
      height={52}
      alt="Afrimetrica: Data, Research, Executive Training"
    />
  );
}

// Never touches the database, so public pages stay fast and cacheable.
export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" href="/">
          <Logo />
        </Link>
        <NavLinks />
      </div>
      <SectionNav />
    </header>
  );
}
