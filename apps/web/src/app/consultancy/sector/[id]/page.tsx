import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsultancyAsk } from "@/components/services/asks";
import { Crumbs, Head, LinkCards, TickList } from "@/components/site/sections";
import { CO_SECTORS, coSector, coService, lcFirst } from "@/content/sections";

type P = { params: Promise<{ id: string }> };
export const generateStaticParams = () => CO_SECTORS.map((x) => ({ id: x.id }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const x = coSector((await params).id);
  return x
    ? {
        title: `Consultancy for ${lcFirst(x.name)}`,
        description: x.summary,
        alternates: { canonical: `/consultancy/sector/${x.id}` },
      }
    : {};
}

export default async function Sector({ params }: P) {
  const x = coSector((await params).id);
  if (!x) notFound();
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/consultancy", "Consultancy"],
          ["", x.name],
        ]}
      />
      <Head eyebrow="Sector" title={`Consultancy for ${lcFirst(x.name)}`}>
        {x.summary}
      </Head>
      <section className="card">
        <h2>Typical assignments</h2>
        <TickList items={x.assignments} />
      </section>
      <section className="stack">
        <h2>Services that fit</h2>
        <LinkCards
          cards={x.services
            .map(coService)
            .filter((s) => !!s)
            .map((s) => ({ href: `/consultancy/service/${s.id}`, title: s.name, text: s.summary }))}
        />
      </section>
      <ConsultancyAsk
        title="Discuss your project"
        message={`Sector: ${x.name}\nOur organisation and project: \nTimeline and location: `}
      />
    </main>
  );
}
