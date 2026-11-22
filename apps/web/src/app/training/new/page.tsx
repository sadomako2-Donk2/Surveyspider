import type { Metadata } from "next";
import Link from "next/link";
import { CourseLines, Crumbs, Head } from "@/components/site/sections";
import { COURSES, NEW_COURSES, course } from "@/content/sections";

export const metadata: Metadata = {
  title: "New courses",
  description: "Recently added executive and professional courses from Afrimetrica Academy.",
  alternates: { canonical: "/training/new" },
};

export default function NewCourses() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ["", "New courses"],
        ]}
      />
      <Head eyebrow="New" title="New courses">
        Recently added executive and professional courses. All run in the classroom, live online or in-house.
      </Head>
      <section className="card">
        <CourseLines courses={NEW_COURSES.map(course).filter((c) => !!c)} showSubject />
      </section>
      <p>
        <Link className="btn" href="/training/finder">
          Search all {COURSES.length} courses
        </Link>
      </p>
    </main>
  );
}
