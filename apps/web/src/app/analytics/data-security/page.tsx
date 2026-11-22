import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head, TickList } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "How we protect your data",
  description: "How Afrimetrica Analytics handles client data, in line with Ghana's Data Protection Act.",
  alternates: { canonical: "/analytics/data-security" },
};

export default function DataSecurity() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/analytics", "Analytics"],
          ["", "Data security"],
        ]}
      />
      <Head eyebrow="Data security" title="How we protect your data">
        Your data stays yours. We handle it carefully and in line with data protection law, including Ghana&apos;s Data
        Protection Act, 2012 (Act 843).
      </Head>
      <div className="split">
        <section className="card">
          <h2>Our approach</h2>
          <TickList
            items={[
              [
                "Only what we need",
                "Where possible, remove names and contact details before you send data. We can help you do this.",
              ],
              ["Used only for your project", "We don't use or share your data for anything else."],
              ["Limited access", "Only the people working on your project can open your data."],
              ["Returned or deleted", "At the end of the project we return or delete your data, as agreed with you."],
            ]}
          />
        </section>
        <section className="card">
          <h2>Before you share data</h2>
          <p className="muted">
            Tell us what the data contains when you first get in touch, but don&apos;t send the data itself until
            we&apos;ve agreed how it will be transferred. We&apos;re happy to sign your organisation&apos;s
            confidentiality agreement.
          </p>
          <p>
            <Link className="btn primary" href="/analytics/request">
              Request an analysis
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
