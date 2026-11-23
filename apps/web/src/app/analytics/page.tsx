import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsAsk, AN_STEPS, Steps } from "@/components/services/asks";
import { Photo } from "@/components/site/Photo";
import { Head, LinkCards } from "@/components/site/sections";
import { Slideshow } from "@/components/site/Slideshow";
import { slidesStartingWith } from "@/content/photos";
import { AN_SECTORS, AN_SERVICES } from "@/content/sections";

export const metadata: Metadata = {
  title: "Data analysis",
  description:
    "Afrimetrica Analytics: statistical analysis, survey data, monitoring and evaluation, dashboards, data management, market and predictive analytics for organisations, governments and NGOs.",
  alternates: { canonical: "/analytics" },
};

export default function Analytics() {
  return (
    <main id="main" className="wrap stack xl">
      <div className="feature">
        <Photo slot="analyticsTeam" />
        <Head eyebrow="Afrimetrica Analytics" title="Data analysis you can rely on">
          Send us your data and your questions. Our analysts clean it, analyse it with the right methods and give
          organisations, governments and NGOs results they can explain, defend and act on.
        </Head>
      </div>
      <Slideshow slides={slidesStartingWith("analytics")} />
      <section className="stack" aria-labelledby="svc-h">
        <div className="section-head">
          <span className="eyebrow">Services</span>
          <h2 id="svc-h" className="h2xl">
            What we can do with your data
          </h2>
        </div>
        <LinkCards
          cards={AN_SERVICES.map((x) => ({ href: `/analytics/service/${x.id}`, title: x.name, text: x.summary }))}
        />
      </section>
      <section className="stack" aria-labelledby="sec-h">
        <div className="section-head">
          <span className="eyebrow">Sectors</span>
          <h2 id="sec-h" className="h2xl">
            Analysis for your sector
          </h2>
        </div>
        <nav className="sub-jump" aria-label="Sectors">
          {AN_SECTORS.map((x) => (
            <Link key={x.id} href={`/analytics/sector/${x.id}`}>
              {x.name}
            </Link>
          ))}
        </nav>
      </section>
      <div className="split">
        <AnalyticsAsk title="Request an analysis" />
        <section className="card">
          <h2>How we work</h2>
          <Steps items={AN_STEPS} />
          <p>
            <Link href="/analytics/how-we-work">More about how we work</Link> ·{" "}
            <Link href="/analytics/data-security">How we protect your data</Link>
          </p>
          <h3>Collecting data with Afrimetrica Surveys?</h3>
          <p className="muted">
            Every survey you run on Afrimetrica Surveys comes with built-in analysis: charts, group comparisons, key
            drivers, statistical tests, AI insight reports and Excel exports.
          </p>
        </section>
      </div>
    </main>
  );
}
