import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Press releases",
  description: "Announcements about Afrimetrica, and media enquiries.",
  alternates: { canonical: "/resources/press" },
};

export default function Press() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/resources", "Resources"],
          ["", "Press releases"],
        ]}
      />
      <Head eyebrow="Press releases" title="Press releases and news">
        Announcements about Afrimetrica, new programmes and published research.
      </Head>
      <div className="split">
        <section className="card">
          <h2>No press releases yet</h2>
          <p className="muted">Our announcements will be published here.</p>
        </section>
        <EnquiryForm
          type="CONTACT"
          title="Media enquiries"
          messageLabel="Your enquiry"
          defaultMessage={"Media enquiry\nPublication or outlet: \nDeadline: \nQuestion: "}
        />
      </div>
    </main>
  );
}
