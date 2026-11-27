import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { Crumbs, Head, TickList } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Join our associate network",
  description:
    "Independent consultants, researchers, trainers, analysts, enumerators and field supervisors: work with Afrimetrica.",
  alternates: { canonical: "/consultancy/work-with-us" },
};

export default function WorkWithUs() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/consultancy", "Consultancy"],
          ["", "Work with us"],
        ]}
      />
      <Head eyebrow="Work with us" title="Join our associate network">
        We work with independent consultants, researchers, trainers, data analysts, enumerators and field supervisors in
        Africa and around the world. Tell us about your skills and where you work.
      </Head>
      <div className="split">
        <EnquiryForm
          type="CONTACT"
          title="Tell us about yourself"
          intro="Share your expertise, languages and locations. We'll keep your details on file and contact you when a suitable assignment comes up."
          messageLabel="Your skills, experience and locations"
          placeholder="e.g. M&E consultant, 8 years' experience, based in Kampala; English and Luganda; available for evaluations in East Africa."
          defaultMessage={
            "I'd like to join the associate network.\nRole (consultant, trainer, analyst, enumerator, supervisor): \nExperience: \nLocation and languages: "
          }
        />
        <section className="card">
          <h2>Who we look for</h2>
          <TickList
            items={[
              "Researchers and evaluators",
              "Trainers for Afrimetrica Academy courses",
              "Data analysts and statisticians",
              "Enumerators, supervisors and field coordinators",
              "Sector specialists, such as health, education, agriculture and finance",
            ]}
          />
          <p className="hint">
            Please don&apos;t send CVs or ID documents yet. We&apos;ll ask for them when there&apos;s a suitable
            assignment.
          </p>
        </section>
      </div>
    </main>
  );
}
