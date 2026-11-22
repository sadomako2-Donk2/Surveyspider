import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "About our certificates",
  description: "Afrimetrica Academy certificates of completion: what they confirm and what they are not.",
  alternates: { canonical: "/about/certificates" },
};

export default function Certificates() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/about", "About"],
          ["", "About our certificates"],
        ]}
      />
      <Head eyebrow="About our certificates" title="Certificates of completion" />
      <div className="split">
        <section className="card">
          <h2>What they confirm</h2>
          <p className="muted">
            Afrimetrica Academy issues certificates of completion. They confirm that a participant attended and
            completed a course, and show the course title, its length, the dates and the venue (or &quot;live
            online&quot;).
          </p>
        </section>
        <section className="card">
          <h2>What they are not</h2>
          <p className="muted">
            They are not accredited academic or professional qualifications, and we don&apos;t claim endorsement by any
            professional body. If your professional body asks you to log training hours, you can usually record an
            Afrimetrica course as CPD yourself; check your body&apos;s own rules.
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
