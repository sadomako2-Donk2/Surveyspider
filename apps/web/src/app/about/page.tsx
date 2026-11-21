import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Ticks } from "@/components/site/blocks";
import { Photo } from "@/components/site/Photo";
import { legalLine } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Afrimetrica is a Ghana-based centre for research methods and analytics, operated by Regelco International Ltd.",
  alternates: { canonical: "/about" },
};

const ORG = [
  ["Organisation", "Afrimetrica — Centre for Research Methods and Analytics"],
  ["Training", "Afrimetrica Academy"],
  ["Survey software", "Afrimetrica Surveys"],
  ["Analytics", "Afrimetrica Analytics"],
  ["Consultancy", "Afrimetrica Consulting"],
  ["Research resources", "Afrimetrica Knowledge Hub"],
  ["Legal operator", "Regelco International Ltd (Ghana)"],
];

export default function About() {
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="About Afrimetrica" title="A research centre built around good evidence">
        Afrimetrica is a Ghana-based centre for research methods and analytics. We work with universities, public
        bodies, NGOs and businesses across Africa and beyond.
      </PageHead>
      <Photo slot="about" wide />
      <div className="split">
        <section className="card">
          <h2>Our mission</h2>
          <p>
            To strengthen the quality and use of research by teaching sound methods, providing reliable tools for
            collecting data, and turning data into evidence people can act on.
          </p>
          <h3>What we stand for</h3>
          <Ticks
            small
            items={[
              { title: "Rigour", text: "Methods that are appropriate, transparent and honestly reported." },
              { title: "Practicality", text: "Approaches that work in real field conditions and budgets." },
              {
                title: "Ethics and data protection",
                text: "Respect for participants, informed consent and careful handling of personal data.",
              },
              { title: "Building capacity", text: "Leaving teams more skilled than we found them." },
            ]}
          />
        </section>
        <section className="card">
          <h2>How we&apos;re organised</h2>
          <dl className="kv">
            {ORG.map(([a, b]) => (
              <div key={a} className="kv-row">
                <dt>{a}</dt>
                <dd>{b}</dd>
              </div>
            ))}
          </dl>
          <p className="hint">{legalLine()}</p>
        </section>
      </div>
      <section className="card">
        <h2>Our team</h2>
        <p className="muted">
          Profiles of our faculty, analysts and consultants will be published here. To work with us or join our
          associate network, <Link href="/contact">get in touch</Link>.
        </p>
      </section>
      <section className="card">
        <h2>About our certificates</h2>
        <p className="muted">
          Afrimetrica Academy issues certificates of completion. They confirm that a participant attended and completed
          a course; they are not accredited academic qualifications.
        </p>
      </section>
    </main>
  );
}
