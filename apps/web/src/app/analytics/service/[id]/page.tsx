import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnalyticsAsk, AN_STEPS, Steps } from "@/components/services/asks";
import { CourseLines, Crumbs, Head, TickList } from "@/components/site/sections";
import { AN_SERVICES, anService, course, lcFirst } from "@/content/sections";

type P = { params: Promise<{ id: string }> };
export const generateStaticParams = () => AN_SERVICES.map((x) => ({ id: x.id }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const x = anService((await params).id);
  return x ? { title: x.name, description: x.summary, alternates: { canonical: `/analytics/service/${x.id}` } } : {};
}

export default async function Service({ params }: P) {
  const x = anService((await params).id);
  if (!x) notFound();
  const courses = x.courses.map(course).filter((c) => !!c);
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/analytics", "Analytics"],
          ["", x.name],
        ]}
      />
      <Head eyebrow="Analytics service" title={x.name}>
        {x.summary}
      </Head>
      <div className="split">
        <section className="card">
          <h2>Questions we help you answer</h2>
          <TickList items={x.questions} />
          <h3>Methods</h3>
          <p className="muted">{x.methods}</p>
        </section>
        <section className="card">
          <h2>What you receive</h2>
          <TickList items={x.deliverables} />
          <h3>How it works</h3>
          <Steps items={AN_STEPS} />
        </section>
      </div>
      {courses.length > 0 && (
        <section className="card">
          <h2>Build these skills in your own team</h2>
          <p className="muted">Related Afrimetrica Academy courses, in the classroom, live online or in-house.</p>
          <CourseLines courses={courses} />
        </section>
      )}
      <AnalyticsAsk
        title={`Ask about ${lcFirst(x.name)}`}
        message={`Service: ${x.name}\nOur data: \nOur questions: `}
      />
    </main>
  );
}
