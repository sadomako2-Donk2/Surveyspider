import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CO_PHASES, ConsultancyAsk, Steps } from "@/components/services/asks";
import { Photo } from "@/components/site/Photo";
import { CourseLines, Crumbs, Head, TickList } from "@/components/site/sections";
import { CO_SERVICES, anService, coService, course, lcFirst } from "@/content/sections";

type P = { params: Promise<{ id: string }> };
export const generateStaticParams = () => CO_SERVICES.map((x) => ({ id: x.id }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const x = coService((await params).id);
  return x ? { title: x.name, description: x.summary, alternates: { canonical: `/consultancy/service/${x.id}` } } : {};
}

export default async function Service({ params }: P) {
  const x = coService((await params).id);
  if (!x) notFound();
  const courses = x.courses.map(course).filter((c) => !!c),
    an = x.analytics.map(anService).filter((s) => !!s);
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/consultancy", "Consultancy"],
          ["", x.name],
        ]}
      />
      <Head eyebrow="Consultancy service" title={x.name}>
        {x.summary}
      </Head>
      <div className="split">
        <section className="card">
          <h2>When this helps</h2>
          <TickList items={x.when} />
        </section>
        <section className="card">
          <h2>What you receive</h2>
          <TickList items={x.deliverables} />
        </section>
      </div>
      <section className="card">
        <h2>How we work</h2>
        <Steps items={CO_PHASES} />
      </section>
      {x.id === "fieldwork" && (
        <section className="feature">
          <Photo slot="fieldwork" />
          <div className="stack">
            <h2>Price face-to-face fieldwork now</h2>
            <p className="muted">
              Trained enumerators and supervisors, digital questionnaires and daily quality checks, in towns and
              villages alike. Upload your questionnaire and get an itemised quote straight away.
            </p>
            <p>
              <Link className="btn gold" href="/surveys/paper">
                Get a fieldwork quote
              </Link>
            </p>
          </div>
        </section>
      )}
      <div className="split">
        {an.length > 0 && (
          <section className="card">
            <h2>Related analytics</h2>
            <ul className="ticks small">
              {an.map((s) => (
                <li key={s.id}>
                  <div>
                    <Link href={`/analytics/service/${s.id}`}>{s.name}</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {courses.length > 0 && (
          <section className="card">
            <h2>Build these skills in your team</h2>
            <CourseLines courses={courses} />
          </section>
        )}
      </div>
      <ConsultancyAsk
        title={`Discuss ${lcFirst(x.name)}`}
        message={`Service: ${x.name}\nOur organisation and project: \nTimeline and location: `}
      />
    </main>
  );
}
