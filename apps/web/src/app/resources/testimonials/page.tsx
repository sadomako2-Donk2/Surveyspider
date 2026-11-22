import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Testimonials",
  description: "Genuine feedback from course participants and clients, published with permission.",
  alternates: { canonical: "/resources/testimonials" },
};

export default function Testimonials() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/resources", "Resources"],
          ["", "Testimonials"],
        ]}
      />
      <Head eyebrow="Testimonials" title="What participants and clients say" />
      <div className="split">
        <section className="card">
          <h2>Genuine feedback only</h2>
          <p className="muted">
            We publish only real comments from course participants and clients, with their permission. Testimonials will
            appear here as courses and projects are completed.
          </p>
          <p className="muted">
            Attended a course or worked with us? We&apos;d value your feedback, whether or not you&apos;d like it
            published.
          </p>
        </section>
        <EnquiryForm
          type="CONTACT"
          title="Share your feedback"
          messageLabel="Your feedback"
          defaultMessage={
            "Course or project: \nYour feedback: \nMay we publish this with your name and organisation? (yes / no / first name only): "
          }
        />
      </div>
    </main>
  );
}
