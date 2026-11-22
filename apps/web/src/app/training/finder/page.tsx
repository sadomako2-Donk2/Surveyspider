import type { Metadata } from "next";
import { Suspense } from "react";
import { Crumbs, Head } from "@/components/site/sections";
import { CourseFinder } from "@/components/training/CourseFinder";
import { COURSES } from "@/content/sections";

export const metadata: Metadata = {
  title: "Course finder",
  description: `Search ${COURSES.length} data, research and executive training courses by subject, venue, format and length.`,
  alternates: { canonical: "/training/finder" },
};

export default function Finder() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ["", "Course finder"],
        ]}
      />
      <Head eyebrow="Course finder" title="Find a course">
        Search {COURSES.length} courses by keyword, subject, venue, format and length.
      </Head>
      <Suspense>
        <CourseFinder />
      </Suspense>
    </main>
  );
}
