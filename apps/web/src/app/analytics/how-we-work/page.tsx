import type { Metadata } from "next";
import Link from "next/link";
import { AN_STEPS, Steps } from "@/components/services/asks";
import { Crumbs, Head, TickList } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "How we work",
  description: "How Afrimetrica Analytics turns your questions and data into clear answers.",
  alternates: { canonical: "/analytics/how-we-work" },
};

export default function HowWeWork() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/analytics", "Analytics"],
          ["", "How we work"],
        ]}
      />
      <Head eyebrow="How we work" title="From your questions to clear answers" />
      <div className="split">
        <section className="card">
          <h2>Step by step</h2>
          <Steps items={AN_STEPS} />
        </section>
        <section className="card">
          <h2>What you can expect</h2>
          <TickList
            items={[
              ["A plan before we start", "An analysis plan, timeline and price agreed with you in writing."],
              ["Plain language", "Results explained so the people who decide can understand them."],
              ["Honest limits", "We say what the data can and can't show, and never overstate results."],
              ["Work you can reuse", "Files or code so the analysis can be checked and repeated."],
            ]}
          />
        </section>
      </div>
      <section className="card">
        <h2>Ways to work with us</h2>
        <div className="units">
          {[
            ["One-off analysis", "A fixed-price project for a specific question or report."],
            ["Ongoing support", "Regular dashboards, reports or analyst time for monitoring systems."],
            ["Analysis with training", "We do the analysis alongside your team so they can do it next time."],
          ].map(([t, d]) => (
            <article key={t} className="unit">
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </article>
          ))}
        </div>
      </section>
      <p>
        <Link className="btn primary" href="/analytics/request">
          Request an analysis
        </Link>
      </p>
    </main>
  );
}
