import type { Metadata } from "next";
import Link from "next/link";
import { CO_PHASES, ConsultancyAsk, Steps } from "@/components/services/asks";
import { Photo } from "@/components/site/Photo";
import { Head, LinkCards } from "@/components/site/sections";
import { Slideshow } from "@/components/site/Slideshow";
import { slidesStartingWith } from "@/content/photos";
import { CO_SECTORS, CO_SERVICES } from "@/content/sections";

export const metadata: Metadata = {
  title: "Research and evaluation consultancy",
  description:
    "Afrimetrica Consulting: research design, monitoring and evaluation, evaluations, fieldwork, feasibility studies, policy research and strategy for organisations, governments and NGOs.",
  alternates: { canonical: "/consultancy" },
};

export default function Consultancy() {
  return (
    <main id="main" className="wrap stack xl">
      <div className="feature">
        <Photo slot="coWorkshop" />
        <Head eyebrow="Afrimetrica Consulting" title="Research and evaluation consultancy">
          From a single questionnaire review to a full multi-site study or a new strategic plan, we design, run and
          report work that stands up to scrutiny, for organisations, governments and NGOs.
        </Head>
      </div>
      <Slideshow slides={slidesStartingWith("consultancy")} />
      <section className="stack" aria-labelledby="svc-h">
        <div className="section-head">
          <span className="eyebrow">Services</span>
          <h2 id="svc-h" className="h2xl">
            How we can help
          </h2>
        </div>
        <LinkCards
          cards={CO_SERVICES.map((x) => ({ href: `/consultancy/service/${x.id}`, title: x.name, text: x.summary }))}
        />
      </section>
      <section className="stack" aria-labelledby="sec-h">
        <div className="section-head">
          <span className="eyebrow">Sectors</span>
          <h2 id="sec-h" className="h2xl">
            Who we work with
          </h2>
        </div>
        <nav className="sub-jump" aria-label="Sectors">
          {CO_SECTORS.map((x) => (
            <Link key={x.id} href={`/consultancy/sector/${x.id}`}>
              {x.name}
            </Link>
          ))}
        </nav>
      </section>
      <div className="split">
        <ConsultancyAsk title="Discuss a project" />
        <section className="card">
          <Photo slot="fieldwork" />
          <h2>Need face-to-face interviews?</h2>
          <p className="muted">
            Upload your questionnaire and get an itemised fieldwork quote in US dollars straight away.
          </p>
          <p>
            <Link className="btn gold" href="/surveys/paper">
              Get a fieldwork quote
            </Link>
          </p>
          <h3>How we work</h3>
          <Steps items={CO_PHASES} />
          <p>
            <Link href="/consultancy/approach">More about our approach</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
