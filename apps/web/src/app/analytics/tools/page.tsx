import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";
import { AN_TOOLS } from "@/content/sections";

export const metadata: Metadata = {
  title: "Tools we use",
  description:
    "The software Afrimetrica Analytics works in: SPSS, Stata, R, Python, Power BI, Excel, NVivo, KoboToolbox and ODK.",
  alternates: { canonical: "/analytics/tools" },
};

export default function Tools() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/analytics", "Analytics"],
          ["", "Tools we use"],
        ]}
      />
      <Head eyebrow="Tools" title="Tools we use">
        We work in the software that suits your data and your team, and hand over files your staff can open, check and
        reuse.
      </Head>
      <div className="area-grid">
        {AN_TOOLS.map((t) => (
          <div key={t.name} className="card area-card">
            <b>{t.name}</b>
            <span className="hint">{t.use}</span>
          </div>
        ))}
      </div>
      <section className="card">
        <h2>Want your team to use these tools?</h2>
        <p className="muted">
          Afrimetrica Academy runs hands-on courses in SPSS, Stata, R, Python, Power BI, Excel and NVivo.
        </p>
        <p>
          <Link className="btn primary" href="/training/area/research">
            See training courses
          </Link>
        </p>
      </section>
    </main>
  );
}
