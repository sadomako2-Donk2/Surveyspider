import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { PageHead, ServiceCards, Ticks } from "@/components/site/blocks";
import { CONSULTANCY_CARDS } from "@/content/pages";

export const metadata: Metadata = {
  title: "Consultancy",
  description:
    "Afrimetrica Consulting: research design, monitoring and evaluation, surveys and fieldwork, and commissioned studies.",
  alternates: { canonical: "/consultancy" },
};

export default function Consultancy() {
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="Afrimetrica Consulting" title="Research and evaluation consultancy">
        From a single questionnaire review to a full multi-site study, we design, run and report research that stands up
        to scrutiny.
      </PageHead>
      <ServiceCards cards={CONSULTANCY_CARDS} />
      <div className="split">
        <EnquiryForm
          type="CONSULTANCY"
          title="Discuss a project"
          intro="Tell us about your project. We'll reply within two working days to arrange a call."
          messageLabel="About your project"
          placeholder="Objectives, target population, locations, deadlines and any terms of reference."
        />
        <section className="card">
          <h2>Need face-to-face interviews?</h2>
          <p className="muted">
            Upload your questionnaire and get an itemised fieldwork quote in US dollars straight away.{" "}
            <Link href="/surveys/paper">Get a fieldwork quote</Link>.
          </p>
          <h3>Who we work with</h3>
          <Ticks
            small
            items={[
              "Universities and research institutes",
              "Government agencies and public bodies",
              "NGOs and development partners",
              "Businesses and market research buyers",
            ]}
          />
        </section>
      </div>
    </main>
  );
}
