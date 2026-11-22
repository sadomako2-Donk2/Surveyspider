import type { Metadata } from "next";
import { Crumbs, Head, Statement, TickList } from "@/components/site/sections";
import { ABOUT } from "@/content/sections";

export const metadata: Metadata = {
  title: "Our mission",
  description: ABOUT.mission,
  alternates: { canonical: "/about/mission" },
};

export default function Mission() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/about", "About"],
          ["", "Our mission"],
        ]}
      />
      <Head eyebrow="Our mission" title="Why we exist" />
      <Statement>{ABOUT.mission}</Statement>
      <section className="card">
        <h2>What we stand for</h2>
        <TickList items={ABOUT.values.map((v) => [v.title, v.text] as [string, string])} />
      </section>
    </main>
  );
}
