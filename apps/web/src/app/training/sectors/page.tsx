import type { Metadata } from "next";
import { Crumbs, Head, LinkCards } from "@/components/site/sections";
import { SECTOR_GROUP, coursesInSubject, group, subjectName } from "@/content/sections";

export const metadata: Metadata = {
  title: "Training sectors",
  description: "Training built around specific sectors, from energy and health to the public sector and agribusiness.",
  alternates: { canonical: "/training/sectors" },
};

export default function Sectors() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ["", "Training sectors"],
        ]}
      />
      <Head eyebrow="Training sectors" title="Training for your sector">
        Courses built around the challenges of specific sectors, from energy and health to the public sector and
        agribusiness. Any course can also be tailored to your organisation.
      </Head>
      <LinkCards
        cards={(group(SECTOR_GROUP)?.subjects ?? []).map((k) => ({
          href: `/training/subject/${k}`,
          title: subjectName(k),
          text: `${coursesInSubject(k).length} course${coursesInSubject(k).length === 1 ? "" : "s"}`,
        }))}
      />
    </main>
  );
}
