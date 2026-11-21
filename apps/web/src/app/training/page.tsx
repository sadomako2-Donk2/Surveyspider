import type { Metadata } from "next";
import { CourseCard } from "@/components/academy/CourseCard";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { PageHead, Ticks } from "@/components/site/blocks";
import { Photo } from "@/components/site/Photo";
import courseTemplates from "@/content/course-templates.json";
import { getDb } from "@/lib/db";
import { listPublishedCourses } from "@/server/academy/service";
import { courseCardView } from "@/server/academy/view";

export const metadata: Metadata = {
  title: "Training",
  description:
    "Afrimetrica Academy: practical courses in research design, surveys, sampling, data analysis, qualitative methods, monitoring and evaluation, and research ethics.",
  alternates: { canonical: "/training" },
};
export const dynamic = "force-dynamic"; // dates and seats change as people register

async function courses() {
  try {
    return (await listPublishedCourses(getDb())).map(courseCardView);
  } catch (e) {
    console.error("Couldn't load courses:", e instanceof Error ? e.message : e);
    return null;
  }
}

export default async function Training() {
  const list = await courses();
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="Afrimetrica Academy" title="Research methods training">
        Practical courses in research design, survey methods, data analysis, qualitative methods and monitoring and
        evaluation. Public short courses, online learning and in-house workshops for your organisation.
      </PageHead>
      <Photo slot="training" wide />

      {list && list.length ? (
        <section className="stack" aria-labelledby="courses-h">
          <h2 id="courses-h" className="h2xl">
            Courses
          </h2>
          <div className="course-grid">
            {list.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      ) : (
        <section className="stack">
          <div className="section-head">
            <h2 className="h2xl">Topics we teach</h2>
            <p className="muted">
              {list === null
                ? "Course dates can't be shown right now. Please try again shortly."
                : "Our course schedule is being finalised. Register your interest and we'll contact you when dates are announced."}
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
      )}

      <div className="split">
        <EnquiryForm
          type="TRAINING"
          title="Training for your organisation"
          intro="Tell us what you'd like to learn, how many people would attend and where. We run public courses and tailored in-house workshops."
          serviceLabel="What are you interested in?"
          messageLabel="Topics, group size and location"
          placeholder="e.g. A 2-day questionnaire design workshop for 20 M&E staff in Kumasi"
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
