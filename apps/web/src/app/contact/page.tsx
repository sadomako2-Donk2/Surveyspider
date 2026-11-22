import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { PageHead } from "@/components/site/blocks";
import { getContactSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Afrimetrica about courses, surveys, data analysis or a research project.",
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-dynamic"; // details come from the database and can change at any time

export default async function Contact() {
  const st = await getContactSettings();
  const wa = (st.whatsapp ?? "").replace(/\D/g, "");
  const items = [
    st.email && { label: "Email", node: <a href={`mailto:${st.email}`}>{st.email}</a> },
    st.phone && { label: "Phone", node: <a href={`tel:${st.phone.replace(/[^\d+]/g, "")}`}>{st.phone}</a> },
    wa && {
      label: "WhatsApp",
      node: (
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
          Message us on WhatsApp
        </a>
      ),
    },
    st.address && { label: "Office", node: <span className="pre">{st.address}</span> },
    st.hours && { label: "Hours", node: <span>{st.hours}</span> },
    st.linkedin && {
      label: "LinkedIn",
      node: (
        <a href={st.linkedin} target="_blank" rel="noopener noreferrer">
          Follow Afrimetrica
        </a>
      ),
    },
  ].filter(Boolean) as { label: string; node: React.ReactNode }[];
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="Contact" title="Get in touch">
        Questions about courses, surveys, analysis or a project? Send us a message and we&apos;ll reply within two
        working days.
      </PageHead>
      <div className="split">
        <EnquiryForm type="CONTACT" title="Send us a message" messageLabel="Your message" />
        <section className="card">
          <h2>Contact details</h2>
          {items.length ? (
            <dl className="contact">
              {items.map((i) => (
                <div key={i.label}>
                  <dt className="hint">{i.label}</dt>
                  <dd>{i.node}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">Use the form and we&apos;ll reply by email.</p>
          )}
          <h3>Looking for something specific?</h3>
          <ul className="links">
            <li>
              <Link href="/training">Course registration and in-house training</Link>
            </li>
            <li>
              <Link href="/consultancy">Research and evaluation projects</Link>
            </li>
            <li>
              <Link href="/analytics">Data analysis requests</Link>
            </li>
            <li>
              <Link href="/surveys">Survey tools and face-to-face fieldwork quotes</Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
