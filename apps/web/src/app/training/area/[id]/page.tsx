import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseLines, Crumbs, Head } from "@/components/site/sections";
import { GROUPS, coursesInGroup, coursesInSubject, group, subjectName } from "@/content/sections";

type P = { params: Promise<{ id: string }> };
export const generateStaticParams = () => GROUPS.map((g) => ({ id: g.id }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const g = group((await params).id);
  return g
    ? {
        title: `${g.name} training courses`,
        description: `${g.subjects.length} subjects and ${coursesInGroup(g.id).length} courses in ${g.name}, in the classroom, live online or in-house.`,
        alternates: { canonical: `/training/area/${g.id}` },
      }
    : {};
}

export default async function Area({ params }: P) {
  const g = group((await params).id);
  if (!g) notFound();
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ["", g.name],
        ]}
      />
      <Head eyebrow="Subject area" title={g.name}>
        {g.subjects.length} subjects · {coursesInGroup(g.id).length} courses. Every course can run in the classroom,
        live online or in-house.
      </Head>
      <nav className="sub-jump" aria-label="Subjects in this area">
        {g.subjects.map((k) => (
          <Link key={k} href={`/training/subject/${k}`}>
            {subjectName(k)} <span className="hint">{coursesInSubject(k).length}</span>
          </Link>
        ))}
      </nav>
      {g.subjects.map((k) => (
        <section key={k} className="card">
          <div className="row-between">
            <h2>{subjectName(k)}</h2>
            <Link className="btn small" href={`/training/subject/${k}`}>
              Subject page
            </Link>
          </div>
          <CourseLines courses={coursesInSubject(k)} />
        </section>
      ))}
    </main>
  );
}
