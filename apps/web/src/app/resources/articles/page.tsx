import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";
import { GUIDES } from "@/content/pages";

export const metadata: Metadata = {
  title: "Articles and guides",
  description: "Practical, free guides on research methods, surveys and evaluation.",
  alternates: { canonical: "/resources/articles" },
};

export default function Articles() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/resources", "Resources"],
          ["", "Articles and guides"],
        ]}
      />
      <Head eyebrow="Knowledge Hub" title="Articles and guides">
        Practical, free guides on research methods, surveys and evaluation, written by our team.
      </Head>
      <div className="course-grid">
        {GUIDES.map((g) => (
          <Link key={g.slug} className="card guide-link" href={`/resources/guides/${g.slug}`}>
            <h3>{g.title}</h3>
            <p className="muted">{g.summary}</p>
            <span className="hint">{g.minutes} min read</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
