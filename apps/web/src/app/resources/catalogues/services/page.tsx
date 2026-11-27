import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/site/PrintButton";
import { AN_SERVICES, CO_SERVICES } from "@/content/sections";

export const metadata: Metadata = {
  title: "Analytics and consultancy services",
  description: "Afrimetrica's analytics and consultancy services in brief.",
  alternates: { canonical: "/resources/catalogues/services" },
};

export default function ServicesBrochure() {
  return (
    <main id="main" className="wrap stack">
      <div className="ctas tight no-print">
        <Link className="btn small ghost" href="/resources/catalogues">
          ← Catalogues and brochures
        </Link>
        <PrintButton />
      </div>
      <article className="card printable">
        <header>
          <span className="eyebrow">Afrimetrica</span>
          <h1>Analytics and consultancy services</h1>
          <p className="muted">
            Data, research and executive training, analysis and advice for organisations, governments and NGOs in Africa
            and around the world.
          </p>
        </header>
        {(
          [
            ["Analytics", AN_SERVICES, "/analytics"],
            ["Consultancy", CO_SERVICES, "/consultancy"],
          ] as const
        ).map(([title, list, base]) => (
          <section key={title}>
            <h2>{title}</h2>
            {list.map((x) => (
              <div key={x.id}>
                <h3>
                  <Link href={`${base}/service/${x.id}`}>{x.name}</Link>
                </h3>
                <p>{x.summary}</p>
              </div>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
