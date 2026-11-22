import Link from "next/link";
import type { ReactNode } from "react";
import { type LegalDoc, UPDATED } from "@/content/legal";

/** Turns **bold** and [text](/path) in legal text into markup. */
function rich(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const b = /^\*\*(.+)\*\*$/.exec(part);
    if (b) return <b key={i}>{b[1]}</b>;
    const l = /^\[(.+)\]\((.+)\)$/.exec(part);
    if (l)
      return (
        <Link key={i} href={l[2]!}>
          {l[1]}
        </Link>
      );
    return part;
  });
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main id="main" className="wrap stack">
      <article className="card prose legal">
        <span className="eyebrow">
          {doc.eyebrow} · Last updated {UPDATED}
        </span>
        <h1>{doc.title}</h1>
        <p className="lede">{doc.intro}</p>
        <nav className="legal-toc" aria-label="Contents">
          <ol>
            {doc.sections.map((s, i) => (
              <li key={i}>
                <a href={`#s${i}`}>{s.h}</a>
              </li>
            ))}
          </ol>
        </nav>
        {doc.sections.map((s, i) => (
          <section key={i} id={`s${i}`}>
            <h2>{s.h}</h2>
            {s.p?.map((x, j) => (
              <p key={j}>{rich(x)}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((x, j) => (
                  <li key={j}>{rich(x)}</li>
                ))}
              </ul>
            )}
            {s.after?.map((x, j) => (
              <p key={j}>{rich(x)}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
