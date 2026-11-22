import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { Crumbs, Head, TickList } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Hotel reservation",
  description: "Help with accommodation near your Afrimetrica training venue.",
  alternates: { canonical: "/contact/hotel" },
};

export default function Hotel() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/contact", "Contact"],
          ["", "Hotel reservation"],
        ]}
      />
      <Head eyebrow="Hotel reservation" title="Accommodation for your course">
        Travelling for a classroom course? Tell us your venue, dates and budget, and we&apos;ll reply with accommodation
        options near the venue and help you book.
      </Head>
      <div className="split">
        <EnquiryForm
          type="CONTACT"
          title="Request accommodation help"
          messageLabel="Your stay"
          defaultMessage={
            "Hotel reservation request\nCourse: \nVenue city: \nCheck-in and check-out dates: \nNumber of rooms and guests: \nBudget per night: "
          }
        />
        <section className="card">
          <h2>Good to know</h2>
          <TickList
            items={[
              "Ask as early as you can: hotels near popular venues fill up.",
              "Tell us about any accessibility or dietary needs.",
              "For in-house courses, the training takes place at your premises.",
            ]}
          />
          <p>
            <Link className="btn" href="/training/venues">
              See training venues
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
