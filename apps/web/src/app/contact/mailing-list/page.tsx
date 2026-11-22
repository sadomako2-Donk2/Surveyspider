import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { Crumbs, Head, TickList } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Mailing list",
  description: "Hear about new courses, course dates, free guides and events from Afrimetrica.",
  alternates: { canonical: "/contact/mailing-list" },
};

export default function MailingList() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/contact", "Contact"],
          ["", "Mailing list"],
        ]}
      />
      <Head eyebrow="Mailing list" title="Join our mailing list">
        Hear about new courses, course dates, free guides and events. We&apos;ll only email you about Afrimetrica, and
        you can ask to be removed at any time.
      </Head>
      <div className="split">
        <EnquiryForm
          type="CONTACT"
          title="Sign up"
          messageLabel="Your interests"
          defaultMessage={
            "Please add me to the Afrimetrica mailing list.\nInterests (training, analytics, consultancy, research guides): \nCountry: "
          }
        />
        <section className="card">
          <h2>What you&apos;ll receive</h2>
          <TickList
            items={[
              "New courses and dates in your region",
              "New guides and resources",
              "Occasional news about our work",
            ]}
          />
        </section>
      </div>
    </main>
  );
}
