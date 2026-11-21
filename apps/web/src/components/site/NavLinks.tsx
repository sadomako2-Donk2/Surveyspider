"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/site";

const ACCOUNT_PATHS = ["/account", "/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

/** Which top-level section a path belongs to (e.g. /resources/guides/x → /resources). */
export function sectionOf(path: string): string {
  if (ACCOUNT_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return "/account";
  const first = `/${path.split("/")[1] ?? ""}`;
  return NAV.some((n) => n.href === first) ? first : path === "/" ? "/" : "";
}

export function NavLinks() {
  const current = sectionOf(usePathname());
  return (
    <nav className="tabs" aria-label="Main">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
