import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/site/blocks";
import { SampleSizeCalculator } from "@/components/site/SampleSizeCalculator";
import { GUIDES, OPEN_DATA } from "@/content/pages";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Afrimetrica Knowledge Hub: free guides on survey questions, sample size, rating scales and monitoring and evaluation, a sample size calculator and open data.",
  alternates: { canonical: "/resources" },
};

export default function Resources() {
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="Afrimetrica Knowledge Hub" title="Resources for better research">
        Free guides, a sample size calculator and links to open data.
      </PageHead>
      <section className="stack">
        <h2 className="h2xl">Guides</h2>
        <div className="course-grid">
          {GUIDES.map((g) => (
            <Link key={g.slug} className="card guide-link" href={`/resources/guides/${g.slug}`}>
              <h3>{g.title}</h3>
              <p className="muted">{g.summary}</p>
              <span className="hint">{g.minutes} min read</span>
            </Link>
          ))}
        </div>
      </section>
      <SampleSizeCalculator />
      <section className="card">
        <h2>Open data</h2>
        <ul className="links">
          {OPEN_DATA.map((d) => (
            <li key={d.href}>
              <a href={d.href} target="_blank" rel="noopener noreferrer">
                {d.name}
              </a>
              <span>{d.text}</span>
            </li>
          ))}
        </ul>
        <p className="hint">
          Survey templates and published findings will appear here when the survey tools move to the new site.
        </p>
      </section>
    </main>
  );
}
