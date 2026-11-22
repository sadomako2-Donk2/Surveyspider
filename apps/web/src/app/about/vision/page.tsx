import type { Metadata } from "next";
import { Crumbs, Head, Statement, TickList } from "@/components/site/sections";
import { ABOUT } from "@/content/sections";

export const metadata: Metadata = {
  title: "Our vision",
  description: ABOUT.vision,
  alternates: { canonical: "/about/vision" },
};

export default function Vision() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/about", "About"],
          ["", "Our vision"],
        ]}
      />
      <Head eyebrow="Our vision" title="The future we are working towards" />
      <Statement>{ABOUT.vision}</Statement>
      <section className="card">
        <h2>How we get there</h2>
        <TickList
          items={[
            ["Skills", "Training leaders and teams in data, research and management through Afrimetrica Academy."],
            ["Data", "Reliable surveys and data collection through Afrimetrica Surveys and our field teams."],
            ["Evidence", "Independent analysis and research through Afrimetrica Analytics and Afrimetrica Consulting."],
            ["Knowledge", "Free guides and tools for everyone through the Afrimetrica Knowledge Hub."],
          ]}
        />
      </section>
    </main>
  );
}
