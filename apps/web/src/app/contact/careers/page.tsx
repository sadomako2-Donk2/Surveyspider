import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Careers",
  description: "Careers and associate opportunities at Afrimetrica.",
  alternates: { canonical: "/contact/careers" },
};

export default function Careers() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/contact", "Contact"],
          ["", "Careers"],
        ]}
      />
      <Head eyebrow="Careers" title="Careers at Afrimetrica">
        We&apos;re building a team of researchers, analysts, trainers and field staff in Africa and around the world.
      </Head>
      <div className="split">
        <section className="card">
          <h2>Current vacancies</h2>
          <p className="muted">
            There are no advertised vacancies at the moment. When there are, they will be listed here.
          </p>
        </section>
        <section className="card">
          <h2>Work with us as an associate</h2>
          <p className="muted">
            We regularly work with independent consultants, trainers, data analysts, enumerators and field supervisors.
            Join our associate network and we&apos;ll contact you when a suitable assignment comes up.
          </p>
          <p>
            <Link className="btn primary" href="/consultancy/work-with-us">
              Join the associate network
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
