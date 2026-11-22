import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnalyticsAsk } from "@/components/services/asks";
import { Crumbs, Head, LinkCards, TickList } from "@/components/site/sections";
import { AN_SECTORS, anSector, anService, lcFirst } from "@/content/sections";

type P = { params: Promise<{ id: string }> };
export const generateStaticParams = () => AN_SECTORS.map((x) => ({ id: x.id }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const x = anSector((await params).id);
  return x
    ? {
        title: `Data analysis for ${lcFirst(x.name)}`,
        description: x.summary,
        alternates: { canonical: `/analytics/sector/${x.id}` },
      }
    : {};
}

export default async function Sector({ params }: P) {
  const x = anSector((await params).id);
  if (!x) notFound();
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/analytics", "Analytics"],
          ["", x.name],
        ]}
      />
      <Head eyebrow="Sector" title={`Data analysis for ${lcFirst(x.name)}`}>
        {x.summary}
      </Head>
      <section className="card">
        <h2>Questions we help answer</h2>
        <TickList items={x.questions} />
      </section>
      <section className="stack">
        <h2>Services that fit</h2>
        <LinkCards
          cards={x.services
            .map(anService)
            .filter((s) => !!s)
            .map((s) => ({ href: `/analytics/service/${s.id}`, title: s.name, text: s.summary }))}
        />
      </section>
      <AnalyticsAsk
        title={`Ask about analysis for ${lcFirst(x.name)}`}
        message={`Sector: ${x.name}\nOur data: \nOur questions: `}
      />
    </main>
  );
}
