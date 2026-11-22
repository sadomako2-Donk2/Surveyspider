import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseLines, Crumbs, Head } from "@/components/site/sections";
import { TrainingAsk } from "@/components/training/TrainingAsk";
import { SUBJECTS, SUBJECT_INTRO, coursesInSubject, groupsOfSubject, subjectName } from "@/content/sections";

type P = { params: Promise<{ id: string }> };
export const generateStaticParams = () => Object.keys(SUBJECTS).map((id) => ({ id }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const k = (await params).id;
  return SUBJECTS[k]
    ? {
        title: `${subjectName(k)} training courses`,
        description:
          SUBJECT_INTRO[k] ??
          `${subjectName(k)} courses from Afrimetrica Academy, in the classroom, live online or in-house.`,
        alternates: { canonical: `/training/subject/${k}` },
      }
    : {};
}

export default async function Subject({ params }: P) {
  const k = (await params).id;
  if (!SUBJECTS[k]) notFound();
  const areas = groupsOfSubject(k),
    list = coursesInSubject(k),
    area = areas[0];
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ...(area ? ([[`/training/area/${area.id}`, area.name]] as [string, string][]) : []),
          ["", subjectName(k)],
        ]}
      />
      <Head eyebrow={areas.map((a) => a.name).join(" · ")} title={`${subjectName(k)} training courses`}>
        {SUBJECT_INTRO[k] ??
          `${list.length} course${list.length === 1 ? "" : "s"}, in the classroom, live online or in-house.`}
      </Head>
      <section className="card">
        <CourseLines courses={list} />
      </section>
      {area && (
        <section className="stack">
          <h2>More in {area.name}</h2>
          <nav className="sub-jump">
            {area.subjects
              .filter((x) => x !== k)
              .map((x) => (
                <Link key={x} href={`/training/subject/${x}`}>
                  {subjectName(x)} <span className="hint">{coursesInSubject(x).length}</span>
                </Link>
              ))}
          </nav>
        </section>
      )}
      <TrainingAsk title={`Ask about ${subjectName(k)} training`} />
    </main>
  );
}
