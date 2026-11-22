import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Ticks } from "@/components/site/blocks";
import { Slideshow } from "@/components/site/Slideshow";
import { slidesStartingWith } from "@/content/photos";

export const metadata: Metadata = {
  title: "About",
  description: "Afrimetrica provides research methods training, survey tools, data analytics and consultancy.",
  alternates: { canonical: "/about" },
};

const ORG = [
  ["Organisation", "Afrimetrica — Research Methods and Analytics"],
  ["Training", "Afrimetrica Academy"],
  ["Survey software", "Afrimetrica Surveys"],
  ["Analytics", "Afrimetrica Analytics"],
  ["Consultancy", "Afrimetrica Consulting"],
  ["Research resources", "Afrimetrica Knowledge Hub"],
];

export default function About() {
  return (
    <main id="main" className="wrap stack xl">
      <PageHead eyebrow="About Afrimetrica" title="Research built around good evidence">
        Afrimetrica provides research methods training, survey tools, data analytics and consultancy. We work with
        universities, public bodies, NGOs and businesses across Africa and beyond.
      </PageHead>
      <Slideshow slides={slidesStartingWith("about")} />
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
