import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "@/content/pages";
import { sampleSize } from "@/lib/sample-size";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.summary,
    alternates: { canonical: `/resources/guides/${g.slug}` },
    openGraph: { type: "article" },
  };
}

function SampleTable() {
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Margin of error</th>
              <th scope="col">Responses needed</th>
            </tr>
          </thead>
          <tbody>
            {[10, 5, 3, 2].map((m) => (
              <tr key={m}>
                <td>±{m}%</td>
                <td className="n">{sampleSize(1.96, m / 100).toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">For a yes/no style result, assuming a 50% split, which gives the largest (safest) number.</p>
    </>
  );
}

export default async function GuidePage({ params }: Props) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  return (
    <main id="main" className="wrap stack">
      <nav aria-label="Breadcrumb" className="hint">
        <Link href="/resources">Resources</Link> › Guides
      </nav>
      <article className="card prose">
        <span className="eyebrow">Afrimetrica Knowledge Hub · {g.minutes} min read</span>
        <h1>{g.title}</h1>
        <p className="lede">{g.summary}</p>
        {g.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.sampleTable ? <SampleTable /> : <p>{s.body}</p>}
          </section>
        ))}
        <div className="ctas">
          <Link className="btn primary" href="/resources">
            More resources
          </Link>
          <Link className="btn" href="/training">
            See our courses
          </Link>
        </div>
      </article>
    </main>
  );
}
