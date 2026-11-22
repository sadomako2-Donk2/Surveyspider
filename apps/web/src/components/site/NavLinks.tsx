"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navDrop } from "@/content/menus";
import { NAV } from "@/lib/site";

const ACCOUNT_PATHS = ["/account", "/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

/** Which top-level section a path belongs to (e.g. /resources/guides/x → /resources). */
export function sectionOf(path: string): string {
  if (ACCOUNT_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return "/account";
  if (path.startsWith("/s/")) return "/surveys";
  const first = `/${path.split("/")[1] ?? ""}`;
  return NAV.some((n) => n.href === first) ? first : path === "/" ? "/" : "";
}

/**
 * The main menu. On devices with a mouse, resting on an item (or tabbing to it) shows that section's pages;
 * on touch screens a tap simply opens the section.
 */
export function NavLinks() {
  const path = usePathname();
  const current = sectionOf(path);
  // An open dropdown belongs to the page it was opened on, so it closes by itself when the page changes.
  const [state, setDrop] = useState<{ path: string; section: string; left: number; top: number } | null>(null);
  const drop = state && state.path === path ? state : null;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!drop) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setDrop(null);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [drop]);
  // Keep the panel inside the window (adjusted directly once it is drawn, as its width isn't known before).
  const placePanel = (el: HTMLDivElement | null) => {
    panel.current = el;
    if (!el || !drop) return;
    const head = el.parentElement!.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(drop.left, head.width - el.offsetWidth - 8))}px`;
  };
  const show = (section: string, a: HTMLElement) => {
    clearTimeout(timer.current);
    if (!window.matchMedia?.("(hover: hover)").matches || !navDrop(section)) return setDrop(null);
    const head = a.closest("header")!.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    setDrop({ path, section, left: r.left - head.left, top: r.bottom - head.top + 6 });
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDrop(null), 220);
  };
  const groups = drop ? navDrop(drop.section) : null;
  return (
    <>
      <nav className="tabs" aria-label="Main" onMouseLeave={hide}>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={current === n.href ? "page" : undefined}
            onMouseEnter={(e) => show(n.href, e.currentTarget)}
            onFocus={(e) => show(n.href, e.currentTarget)}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {groups && (
        <div
          ref={placePanel}
          className="nav-drop"
          style={{ left: drop!.left, top: drop!.top }}
          role="region"
          aria-label={`${NAV.find((n) => n.href === drop!.section)?.label ?? ""} pages`}
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={hide}
        >
          {groups.map((g) => (
            <div key={g.title}>
              <h3>{g.title}</h3>
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={() => setDrop(null)}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
