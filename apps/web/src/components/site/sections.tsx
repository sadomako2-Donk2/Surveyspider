// Building blocks for the section pages (training catalogue, analytics, consultancy, about, resources, contact).
import Link from "next/link";
import type { ReactNode } from "react";
import { type Course, GROUPS, coursesInGroup, subjectName } from "@/content/sections";

export function Crumbs({ items }: { items: [href: string, label: string][] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map(([href, label], i) => (
        <span key={i}>
          {i > 0 && " › "}
          {href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Head({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p className="lede">{children}</p>}
    </header>
  );
}

export function TickList({ items }: { items: (string | [string, string])[] }) {
  return (
    <ul className="ticks small">
      {items.map((x, i) => (
        <li key={i}>
          <div>
            {typeof x === "string" ? (
              <span>{x}</span>
            ) : (
              <>
                <b>{x[0]}</b>
                <span>{x[1]}</span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CourseLines({ courses, showSubject }: { courses: Course[]; showSubject?: boolean }) {
  if (!courses.length) return <p className="muted">No courses here yet. Ask us: we also design courses on request.</p>;
  return (
    <ul className="course-lines">
      {courses.map((c) => (
        <li key={c.id} className="course-line">
          <div>
            <Link href={`/training/course/${c.id}`}>
              <b>{c.title}</b>
            </Link>
            {showSubject && <span className="hint">{subjectName(c.cat)}</span>}
            <span className="muted">{c.summary}</span>
          </div>
          <div className="course-line-meta">
            <span className="pill">{c.days} days</span>
            <span className="pill">{c.level}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LinkCards({ cards }: { cards: { href: string; title: string; text: string }[] }) {
  return (
    <div className="area-grid">
      {cards.map((c) => (
        <Link key={c.href} className="card area-card" href={c.href}>
          <b>{c.title}</b>
          <span className="hint">{c.text}</span>
        </Link>
      ))}
    </div>
  );
}

export const AreaCards = () => (
  <LinkCards
    cards={GROUPS.map((g) => ({
      href: `/training/area/${g.id}`,
      title: g.name,
      text: `${g.subjects.length} subjects · ${coursesInGroup(g.id).length} courses`,
    }))}
  />
);

export function Statement({ children }: { children: ReactNode }) {
  return (
    <section className="card statement">
      <p>{children}</p>
    </section>
  );
}
