import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head, TickList } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Certificates of completion",
  description: "What an Afrimetrica Academy certificate of completion shows, and what it is not.",
  alternates: { canonical: "/training/certificates" },
};

export default function Certificates() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ["", "Certificates"],
        ]}
      />
      <Head eyebrow="Certificates" title="Certificates of completion">
        Every participant who attends and completes an Afrimetrica Academy course receives a certificate of completion.
      </Head>
      <div className="split">
        <section className="card">
          <h2>What the certificate shows</h2>
          <TickList
            items={[
              "The participant's name",
              "The course title and its length",
              'The dates and the venue, or "live online"',
              "That the participant attended and completed the course",
            ]}
          />
        </section>
        <section className="card">
          <h2>What it is not</h2>
          <p className="muted">
            Our certificates confirm attendance and completion. They are not accredited academic or professional
            qualifications, and we don&apos;t claim endorsement by any professional body.
          </p>
          <h3>Continuing professional development</h3>
          <p className="muted">
            If your professional body asks you to log training hours, you can usually record an Afrimetrica course as
            CPD yourself. Check your body&apos;s own rules.
          </p>
        </section>
      </div>
      <p>
        <Link className="btn primary" href="/training/finder">
          Find a course
        </Link>
      </p>
    </main>
  );
}
