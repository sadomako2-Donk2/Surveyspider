import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/academy/CourseCard";
import { Band, Ticks } from "@/components/site/blocks";
import { GUIDES, UNITS } from "@/content/pages";
import { SITE } from "@/lib/site";
import { getDb } from "@/lib/db";
import { siteUrl } from "@/lib/url";
import { listPublishedCourses } from "@/server/academy/service";
import { courseCardView } from "@/server/academy/view";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — Centre for Research Methods and Analytics` },
  description:
    "Afrimetrica helps researchers, organisations and students design better studies, collect reliable data and turn it into evidence: research methods training, survey tools, data analysis and consultancy.",
  alternates: { canonical: "/" },
};

// The page is cached and refreshed every 5 minutes, so the home page stays fast and works even if the database is busy.
export const revalidate = 300;

async function upcomingCourses() {
  try {
    return (await listPublishedCourses(getDb()))
      .map(courseCardView)
      .filter((c) => c.next)
      .slice(0, 3);
  } catch {
    return []; // e.g. no database while building; the page refreshes itself later
  }
}

export default async function Home() {
  const upcoming = await upcomingCourses();
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    alternateName: SITE.longName,
    slogan: SITE.tagline,
    url: siteUrl(),
    parentOrganization: { "@type": "Organization", name: SITE.operator },
  };
  return (
    <main id="main" className="wrap stack xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <section className="hero">
        <div>
          <span className="eyebrow">Centre for Research Methods and Analytics · Ghana</span>
          <h1 className="display">
            Advancing research, <span className="gold-text">measurement and evidence.</span>
          </h1>
          <p className="lede">
            Afrimetrica helps researchers, organisations and students design better studies, collect reliable data and
            turn it into evidence. We train, build survey tools, analyse data and advise, all in one place.
          </p>
          <div className="ctas">
            <Link className="btn gold big" href="/training">
              Explore courses
            </Link>
            <Link className="btn primary big" href="/surveys">
              Start a survey
            </Link>
            <Link className="btn big" href="/consultancy">
              Talk to a consultant
            </Link>
          </div>
        </div>
        <nav className="pillars" aria-label="Afrimetrica's services">
          {UNITS.map((u) => (
            <Link key={u.key} className="pillar" href={u.href}>
              <span className="eyebrow">{u.brand}</span>
              <b>{u.title}</b>
              <span>{u.points[0]}</span>
            </Link>
          ))}
          <Link className="pillar wide" href="/resources">
            <span className="eyebrow">Afrimetrica Knowledge Hub</span>
            <b>Guides, templates and open data</b>
            <span>Free resources for better research</span>
          </Link>
        </nav>
      </section>

      <section className="stack">
        <div className="section-head">
          <span className="eyebrow">What we do</span>
          <h2 className="h2xl">One centre, four ways to strengthen your research</h2>
        </div>
        <div className="units">
          {UNITS.map((u) => (
            <article key={u.key} className="card unit">
              <span className="eyebrow">{u.brand}</span>
              <h3>{u.title}</h3>
              <p className="muted">{u.text}</p>
              <Ticks items={u.points} small />
              <Link className="btn" href={u.href}>
                {u.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="stack" aria-labelledby="upcoming-h">
          <div className="row-between">
            <div className="section-head">
              <span className="eyebrow">Afrimetrica Academy</span>
              <h2 id="upcoming-h" className="h2xl">
                Upcoming courses
              </h2>
            </div>
            <Link className="btn" href="/training">
              All courses
            </Link>
          </div>
          <div className="course-grid">
            {upcoming.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <section className="split">
        <div className="stack">
          <div className="section-head">
            <span className="eyebrow">Afrimetrica Academy</span>
            <h2 className="h2xl">Practical training in research methods</h2>
          </div>
          <p className="muted">
            Short courses and in-house workshops in research design, questionnaires, sampling, data analysis,
            qualitative methods, monitoring and evaluation, and research ethics.
          </p>
          <Link className="btn primary" href="/training">
            See courses and dates
          </Link>
        </div>
        <div className="stack">
          <div className="section-head">
            <span className="eyebrow">Knowledge Hub</span>
            <h2 className="h2xl">Free guides for better research</h2>
          </div>
          {GUIDES.slice(0, 3).map((g) => (
            <Link key={g.slug} className="card guide-link" href={`/resources/guides/${g.slug}`}>
              <b>{g.title}</b>
              <span className="hint">
                {g.summary} · {g.minutes} min read
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Band
        eyebrow="Afrimetrica Consulting"
        title="Planning a study or evaluation?"
        text="Tell us what you need to find out. We can help with design, fieldwork, analysis or the whole project."
        links={[
          { href: "/consultancy", title: "Discuss a project", text: "Research design, M&E and commissioned studies" },
          { href: "/surveys/paper", title: "Get a fieldwork quote", text: "Face-to-face interviews, priced instantly" },
          { href: "/analytics", title: "Request data analysis", text: "Statistics, dashboards and reports" },
          { href: "/training", title: "Train your team", text: "In-house workshops on research methods" },
        ]}
      />
    </main>
  );
}
