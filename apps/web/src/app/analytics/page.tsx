import type { Metadata } from "next";
import Link from "next/link";
import { EnquirySlot, PageHead, ServiceCards } from "@/components/site/blocks";
import { ANALYTICS_CARDS } from "@/content/pages";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Afrimetrica Analytics: statistical analysis, dashboards, data management and survey and M&E data analysis by experienced analysts.",
  alternates: { canonical: "/analytics" },
};

export default function Analytics() {
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="Afrimetrica Analytics" title="Data analysis you can rely on">
        Send us your data and your questions. Our analysts clean it, analyse it with the right methods and give you
        results you can explain and defend.
      </PageHead>
      <ServiceCards cards={ANALYTICS_CARDS} />
      <div className="split">
        <EnquirySlot
          phase1Anchor="analytics"
          title="Request an analysis"
          intro="Describe your data and what you need to know. We'll reply with an approach, a timeline and a quote."
        />
        <section className="card">
          <h2>How we work</h2>
          <ol className="steps">
            <li>You share your data securely and tell us your questions.</li>
            <li>We agree an analysis plan, timeline and price.</li>
            <li>We clean and analyse the data and check the results.</li>
            <li>You receive tables, charts and a plain-language summary, and we walk you through them.</li>
          </ol>
          <h3>Collecting data with Afrimetrica Surveys?</h3>
          <p className="muted">
            Every survey comes with built-in analysis: charts, group comparisons, key drivers, statistical tests, AI
            insight reports and Excel exports. <Link href="/surveys">See the survey tools</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
