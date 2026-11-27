import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/site/PrintButton";
import { COURSES, GROUPS, VENUES, subjectName } from "@/content/sections";

export const metadata: Metadata = {
  title: "Training course catalogue",
  description: "All Afrimetrica Academy courses by subject area, with length and level.",
  alternates: { canonical: "/resources/catalogues/training" },
};

export default function TrainingCatalogue() {
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
          <span className="eyebrow">Afrimetrica Academy</span>
          <h1>Training course catalogue</h1>
          <p className="muted">
            Data, research and executive training. Every course runs in the classroom in our venues in Africa and around
            the world, live online or in-house. Ask us for dates and fees. Participants receive a certificate of
            completion (not an accredited qualification).
          </p>
        </header>
        {GROUPS.map((g) => (
          <section key={g.id}>
            <h2>{g.name}</h2>
            <div className="table-wrap">
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Subject</th>
                    <th>Days</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {COURSES.filter((c) => g.subjects.includes(c.cat)).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/training/course/${c.id}`}>{c.title}</Link>
                      </td>
                      <td>{subjectName(c.cat)}</td>
                      <td className="n">{c.days}</td>
                      <td>{c.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        <p className="hint">Venues: {VENUES.map((v) => `${v.country} (${v.cities.join(", ")})`).join("; ")}.</p>
      </article>
    </main>
  );
}
