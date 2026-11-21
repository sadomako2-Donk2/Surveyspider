import type { Metadata } from "next";
import { EnquirySlot, PageHead, Ticks } from "@/components/site/blocks";
import courseTemplates from "@/content/course-templates.json";

export const metadata: Metadata = {
  title: "Training",
  description:
    "Afrimetrica Academy: practical courses in research design, surveys, sampling, data analysis, qualitative methods, monitoring and evaluation, and research ethics.",
  alternates: { canonical: "/training" },
};

export default function Training() {
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="Afrimetrica Academy" title="Research methods training">
        Practical courses in research design, survey methods, data analysis, qualitative methods and monitoring and
        evaluation. Public short courses, online learning and in-house workshops for your organisation.
      </PageHead>

      {/* Step 5 replaces this list with the live course catalogue (dates, fees, seats and registration). */}
      <section className="stack">
        <div className="section-head">
          <h2 className="h2xl">Topics we teach</h2>
          <p className="muted">
            Our course schedule is being finalised. Register your interest and we&apos;ll contact you when dates are
            announced.
          </p>
        </div>
        <div className="course-grid">
          {courseTemplates.map((c) => (
            <article key={c.title} className="card course">
              <div className="pills">
                {[c.level, c.format, c.duration].map((x) => (
                  <span key={x} className="pill">
                    {x}
                  </span>
                ))}
              </div>
              <h3>{c.title}</h3>
              <p className="muted">{c.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="split">
        <EnquirySlot
          phase1Anchor="training"
          title="Register interest or book in-house training"
          intro="Tell us what you'd like to learn, how many people would attend and where. We run public courses and tailored in-house workshops."
        />
        <section className="card">
          <h2>What to expect</h2>
          <Ticks
            small
            items={[
              { title: "Hands-on learning", text: "Short explanations followed by practice on real or your own data." },
              { title: "Small groups", text: "Enough time for questions and feedback." },
              { title: "Course materials", text: "Slides, templates and exercises to keep." },
              {
                title: "Certificate of completion",
                text: "For participants who attend and complete the course. Not an accredited qualification.",
              },
            ]}
          />
        </section>
      </div>
    </main>
  );
}
