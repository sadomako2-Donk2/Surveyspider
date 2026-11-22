import type { Metadata } from "next";
import { Crumbs, Head, LinkCards } from "@/components/site/sections";
import { AN_SERVICES, COURSES, CO_SERVICES } from "@/content/sections";

export const metadata: Metadata = {
  title: "Catalogues and brochures",
  description: "Afrimetrica's training catalogue and services brochure, to print or save as PDF.",
  alternates: { canonical: "/resources/catalogues" },
};

export default function Catalogues() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/resources", "Resources"],
          ["", "Catalogues and brochures"],
        ]}
      />
      <Head eyebrow="Catalogues and brochures" title="Catalogues and brochures">
        Print or save as PDF to share with colleagues and decision-makers.
      </Head>
      <LinkCards
        cards={[
          {
            href: "/resources/catalogues/training",
            title: "Training course catalogue",
            text: `All ${COURSES.length} courses by subject area, with length and level`,
          },
          {
            href: "/resources/catalogues/services",
            title: "Analytics and consultancy services",
            text: `Our ${AN_SERVICES.length} analytics and ${CO_SERVICES.length} consultancy services in brief`,
          },
        ]}
      />
    </main>
  );
}
