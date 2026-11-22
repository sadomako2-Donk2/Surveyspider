import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Our team",
  description: "The trainers, researchers, analysts and consultants behind Afrimetrica.",
  alternates: { canonical: "/about/team" },
};

export default function Team() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/about", "About"],
          ["", "Our team"],
        ]}
      />
      <Head eyebrow="Our team" title="The people behind Afrimetrica">
        A core team of trainers, researchers, analysts and consultants, supported by an associate network of specialists
        and field staff across English-speaking Africa.
      </Head>
      <section className="card">
        <h2>Leadership and faculty</h2>
        <p className="muted">
          Profiles of our leadership, faculty, analysts and consultants will be published here soon.
        </p>
      </section>
      <section className="card">
        <h2>Join us</h2>
        <p className="muted">
          We work with independent consultants, trainers, analysts, enumerators and field supervisors.
        </p>
        <div className="ctas tight">
          <Link className="btn primary" href="/consultancy/work-with-us">
            Join the associate network
          </Link>
          <Link className="btn" href="/contact/careers">
            Careers
          </Link>
        </div>
      </section>
    </main>
  );
}
