import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd, courseLd } from "@/components/site/JsonLd";
import { Crumbs, Head, TickList } from "@/components/site/sections";
import { RequestCourse } from "@/components/training/RequestCourse";
import { COURSES, FORMATS, course, groupsOfSubject, subjectName } from "@/content/sections";

type P = { params: Promise<{ id: string }> };
export const generateStaticParams = () => COURSES.map((c) => ({ id: c.id }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = course((await params).id);
  return c ? { title: c.title, description: c.summary, alternates: { canonical: `/training/course/${c.id}` } } : {};
}

export default async function CoursePage({ params }: P) {
  const c = course((await params).id);
  if (!c) notFound();
  const area = groupsOfSubject(c.cat)[0];
  return (
    <main id="main" className="wrap stack">
      <JsonLd data={courseLd(c)} />
      <Crumbs
        items={[
          ["/training", "Training"],
          ...(area ? ([[`/training/area/${area.id}`, area.name]] as [string, string][]) : []),
          [`/training/subject/${c.cat}`, subjectName(c.cat)],
          ["", c.title],
        ]}
      />
      <Head eyebrow={subjectName(c.cat)} title={c.title}>
        {c.summary}
      </Head>
      <div className="pills">
        {[`${c.days} days`, c.level, ...FORMATS].map((x) => (
          <span key={x} className="pill">
            {x}
          </span>
        ))}
      </div>
      <div className="cat-detail">
        <div className="stack">
          <section className="card">
            <h2>What you will be able to do</h2>
            <TickList items={c.objectives} />
          </section>
          <section className="card">
            <h2>Who should attend</h2>
            <p>{c.audience}</p>
          </section>
          <section className="card">
            <h2>Course outline</h2>
            <ol className="outline">
              {c.outline.map(([t, topics], i) => (
                <li key={i}>
                  <span className="eyebrow">Day {i + 1}</span>
                  <b>{t}</b>
                  <span className="muted">{topics}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="card">
            <h2>How the course is taught</h2>
            <p className="muted">
              Short explanations, worked examples and practical exercises, with time to work on participants&apos; own
              questions and data. Software courses are taught hands-on: bring a laptop, or ask us about equipment.
              Materials, templates and exercise files are yours to keep.
            </p>
            <h3>Certificate</h3>
            <p className="muted">
              Participants who attend and complete the course receive an Afrimetrica Academy certificate of completion.
              It is not an accredited academic qualification.
            </p>
          </section>
        </div>
        <RequestCourse title={c.title} days={c.days} />
      </div>
    </main>
  );
}
