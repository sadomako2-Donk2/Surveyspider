"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SECTION_MENUS } from "@/content/menus";
import { sectionOf } from "./NavLinks";

const canHover = () => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover)").matches;

/** The menu bar under the main menu for sections that have one (About, Training, Analytics…). */
export function SectionNav() {
  const path = usePathname();
  const menu = SECTION_MENUS[sectionOf(path)];
  // An open panel belongs to the page it was opened on, so it closes by itself when the page changes.
  const [state, setState] = useState<{ path: string; label: string } | null>(null);
  const open = state && state.path === path ? state.label : null;
  const setOpen = (label: string | null) => setState(label ? { path, label } : null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setState(null);
    const click = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setState(null);
    document.addEventListener("keydown", key);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", click);
    };
  }, [open]);
  if (!menu) return null;
  const panel = menu.items.find((i) => i.label === open)?.panel;
  const isCurrent = (href?: string, match?: (p: string) => boolean) => (match ? match(path) : href === path);
  return (
    <div
      className="subnav"
      ref={box}
      onMouseEnter={() => clearTimeout(timer.current)}
      onMouseLeave={() => {
        if (!canHover()) return;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState(null), 260);
      }}
    >
      <div className="subnav-inner wrap">
        <span className="subnav-label">{menu.label}</span>
        <div className="subnav-links">
          {menu.items.map((i) =>
            i.panel ? (
              <button
                key={i.label}
                type="button"
                className="tr-menu-btn"
                aria-expanded={open === i.label}
                aria-controls="sectionPanel"
                aria-current={isCurrent(undefined, i.match) ? "page" : undefined}
                onMouseEnter={() => canHover() && setOpen(i.label)}
                onClick={() => setOpen(canHover() ? i.label : open === i.label ? null : i.label)}
              >
                {i.label} <span aria-hidden="true">▾</span>
              </button>
            ) : (
              <Link key={i.label} href={i.href!} aria-current={isCurrent(i.href, i.match) ? "page" : undefined}>
                {i.style ? (
                  <span className={i.style === "new" ? "new-badge" : "new-badge cta-badge"}>{i.label}</span>
                ) : (
                  i.label
                )}
              </Link>
            ),
          )}
        </div>
      </div>
      {panel && (
        <div className="tr-panel" id="sectionPanel" role="region" aria-label={open ?? undefined}>
          <div className="tr-panel-inner">
            <div className="tr-panel-grid">
              {panel.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(null)}>
                  <b>{l.label}</b>
                  {l.note && <span>{l.note}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
