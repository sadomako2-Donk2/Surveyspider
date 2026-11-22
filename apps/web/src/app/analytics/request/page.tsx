import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsAsk, AN_STEPS, Steps } from "@/components/services/asks";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Request an analysis",
  description: "Describe your data and questions, and we'll reply with an approach, a timeline and a quote.",
  alternates: { canonical: "/analytics/request" },
};

export default function Request() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/analytics", "Analytics"],
          ["", "Request analysis"],
        ]}
      />
      <Head eyebrow="Request analysis" title="Tell us about your data">
        Describe your data and what you need to know. We&apos;ll reply with an approach, a timeline and a quote. Please
        don&apos;t attach or paste the data itself yet.
      </Head>
      <div className="split">
        <AnalyticsAsk title="Request an analysis" />
        <section className="card">
          <h2>How it works</h2>
          <Steps items={AN_STEPS} />
          <p>
            <Link href="/analytics/data-security">How we protect your data</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
