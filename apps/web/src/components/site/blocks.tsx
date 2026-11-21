import Link from "next/link";
import type { ReactNode } from "react";
import type { ServiceCard } from "@/content/pages";

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p className="lede">{children}</p>}
    </header>
  );
}

export function Ticks({ items, small }: { items: (string | { title: string; text: string })[]; small?: boolean }) {
  return (
    <ul className={`ticks${small ? " small" : ""}`}>
      {items.map((x) =>
        typeof x === "string" ? (
          <li key={x}>
            <span>{x}</span>
          </li>
        ) : (
          <li key={x.title}>
            <div>
              <b>{x.title}</b>
              <span>{x.text}</span>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

export function ServiceCards({ cards }: { cards: ServiceCard[] }) {
  return (
    <div className="units">
      {cards.map((c) => (
        <article key={c.title} className="card unit">
          <h2 className="h3">{c.title}</h2>
          <p className="muted">{c.text}</p>
        </article>
      ))}
    </div>
  );
}

/**
 * Where the online enquiry form goes. The forms (with storage, admin inbox and email alerts) are built in
 * Phase 2 step 6; until then this points people to the live site's form. Remove when step 6 lands.
 */
export function EnquirySlot({ title, intro, phase1Anchor }: { title: string; intro: string; phase1Anchor: string }) {
  return (
    <section className="card enquiry-slot" aria-labelledby={`enq-${phase1Anchor}`}>
      <h2 id={`enq-${phase1Anchor}`}>{title}</h2>
      <p className="muted">{intro}</p>
      <p className="hint">
        The online form is being moved to the new site. Until then, please use the form on our current site.
      </p>
      <a className="btn primary" href={`https://surveyspider.onrender.com/#${phase1Anchor}`} rel="noopener">
        Open the enquiry form
      </a>
    </section>
  );
}

export function Band({
  eyebrow,
  title,
  text,
  links,
}: {
  eyebrow: string;
  title: string;
  text: string;
  links: { href: string; title: string; text: string }[];
}) {
  return (
    <section className="band">
      <div className="stack tight">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <div className="band-list">
        {links.map((l) => (
          <Link key={l.href + l.title} className="band-item" href={l.href}>
            <b>{l.title}</b>
            <span>{l.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
