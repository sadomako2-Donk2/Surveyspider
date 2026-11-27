import type { Metadata } from "next";
import Link from "next/link";
import { CO_PHASES, Steps } from "@/components/services/asks";
import { Crumbs, Head, TickList } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Our approach",
  description:
    "How Afrimetrica Consulting runs assignments: independent, rigorous and practical, with quality and ethics built in.",
  alternates: { canonical: "/consultancy/approach" },
};

export default function Approach() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/consultancy", "Consultancy"],
          ["", "Our approach"],
        ]}
      />
      <Head eyebrow="Our approach" title="Independent, rigorous and practical">
        Every assignment follows the same disciplined path, adapted to your questions, budget and context.
      </Head>
      <section className="card">
        <h2>How an assignment runs</h2>
        <Steps items={CO_PHASES} />
      </section>
      <div className="split">
        <section className="card">
          <h2>Quality</h2>
          <TickList
            items={[
              ["Fit-for-purpose methods", "The simplest design that can answer your question credibly."],
              ["Checked results", "Analysis is reviewed before anything is reported."],
              ["Honest findings", "We report what the evidence shows, including what didn't work."],
            ]}
          />
        </section>
        <section className="card">
          <h2>Ethics and data protection</h2>
          <TickList
            items={[
              ["Informed consent", "Participants know what they are agreeing to and can stop at any time."],
              ["Ethics approval", "We seek approval from the relevant committees where a study needs it."],
              ["Safeguarding", "Extra care with children and vulnerable groups."],
              [
                "Data protection",
                "Personal data handled in line with the law, including Ghana's Data Protection Act, 2012.",
              ],
            ]}
          />
        </section>
      </div>
      <section className="card">
        <h2>Our team</h2>
        <p className="muted">
          A core team of researchers and analysts, supported by an associate network of specialists and field staff in
          Africa and around the world.
        </p>
        <p>
          <Link className="btn" href="/consultancy/work-with-us">
            Join our associate network
          </Link>
        </p>
      </section>
    </main>
  );
}
