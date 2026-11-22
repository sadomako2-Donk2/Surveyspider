import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Case studies",
  description: "Accounts of projects Afrimetrica has delivered, published with clients' permission.",
  alternates: { canonical: "/resources/case-studies" },
};

export default function CaseStudies() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/resources", "Resources"],
          ["", "Case studies"],
        ]}
      />
      <Head eyebrow="Case studies" title="Case studies">
        Short accounts of projects we have delivered: the question, what we did, and what changed.
      </Head>
      <section className="card">
        <h2>Coming soon</h2>
        <p className="muted">
          We publish a case study only when the work is complete and the client has agreed to it being shared. The first
          ones will appear here.
        </p>
        <p className="muted">
          Each case study will cover the client&apos;s challenge, the methods we used, what we delivered and the
          difference it made.
        </p>
        <div className="ctas tight">
          <Link className="btn primary" href="/consultancy">
            Our consultancy services
          </Link>
          <Link className="btn" href="/analytics">
            Our analytics services
          </Link>
        </div>
      </section>
    </main>
  );
}
