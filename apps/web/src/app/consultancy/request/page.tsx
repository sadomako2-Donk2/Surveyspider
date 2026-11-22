import type { Metadata } from "next";
import { CO_PHASES, ConsultancyAsk, Steps } from "@/components/services/asks";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Request a proposal",
  description: "Tell us about your project and we'll reply within two working days to arrange a call.",
  alternates: { canonical: "/consultancy/request" },
};

export default function Request() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/consultancy", "Consultancy"],
          ["", "Request a proposal"],
        ]}
      />
      <Head eyebrow="Request a proposal" title="Tell us about your project">
        Share your objectives, locations and timeline, and any terms of reference. We&apos;ll reply within two working
        days to arrange a call, then send a proposal and budget.
      </Head>
      <div className="split">
        <ConsultancyAsk title="Request a proposal" />
        <section className="card">
          <h2>What happens next</h2>
          <Steps items={CO_PHASES} />
        </section>
      </div>
    </main>
  );
}
