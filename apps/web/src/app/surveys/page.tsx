import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, Ticks } from "@/components/site/blocks";
import { Photo } from "@/components/site/Photo";
import { SurveysNav } from "@/components/surveys/SurveysNav";

export const metadata: Metadata = {
  title: "Surveys",
  description:
    "Afrimetrica Surveys: build questionnaires with AI or upload Word, PDF and Excel files, collect responses online or face to face, and analyse them with built-in statistics.",
  alternates: { canonical: "/surveys" },
};

export default function Surveys() {
  return (
    <main id="main" className="wrap stack xl">
      <SurveysNav current="overview" />
      <section className="hero">
        <div>
          <PageHead eyebrow="Afrimetrica Surveys" title="Ask better questions. Get answers you can act on.">
            Draft your survey with AI or upload the questionnaire you already have, find the right people to answer it,
            and turn every response into findings and recommendations.
          </PageHead>
          <div className="ctas">
            <Link className="btn primary big" href="/surveys/new">
              Create a survey
            </Link>
            <Link className="btn big" href="/surveys/import">
              Upload a questionnaire
            </Link>
          </div>
          <p className="hint">
            Uploading Word, PDF and Excel questionnaires opens on our current site until it moves across.
          </p>
        </div>
        <figure className="report-mock" aria-label="Example insight report with sample data">
          <figcaption className="rm-head">
            <span className="eyebrow">Example insight report</span>
            <span className="pill">Sample data</span>
          </figcaption>
          <b className="rm-title">Post-training evaluation · 128 responses</b>
          <div className="rm-kpis">
            <div>
              <b>+42</b>
              <span>Net Promoter Score</span>
            </div>
            <div>
              <b>81%</b>
              <span>Satisfied or very satisfied</span>
            </div>
          </div>
          <p className="rm-row">
            <span className="tag good">Strongest</span> &ldquo;The facilitator explained ideas clearly&rdquo; · 4.6 of 5
          </p>
          <p className="rm-row">
            <span className="tag warn">Fix first</span> &ldquo;I can apply what I learned in my job&rdquo; · 3.4 of 5
          </p>
          <p className="rm-rec">
            <b>Recommendation</b>
            Add a 30-minute workplace practice task to each module, then re-survey in 6 weeks.
          </p>
        </figure>
      </section>
      <Photo slot="surveys" wide />

      <section className="stack">
        <div className="section-head">
          <span className="eyebrow">Three ways to start</span>
          <h2 className="h2xl">From idea to live survey in minutes</h2>
        </div>
        <div className="ways">
          {[
            [
              "Describe it",
              "Create with AI",
              "Say what you need to learn. The AI drafts neutral, well-ordered questions with the right scales.",
            ],
            [
              "Upload it",
              "Word, PDF or Excel upload",
              "Drop in the questionnaire you already have. Questions, options and scales are detected for you.",
            ],
            [
              "Templates",
              "Start from a template",
              "Market research, academic studies, and a full training and development toolkit.",
            ],
          ].map(([n, t, d]) => (
            <article key={t} className="card">
              <span className="eyebrow">{n}</span>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split">
        <div className="stack">
          <div className="section-head">
            <span className="eyebrow">Analytics</span>
            <h2 className="h2xl">From answers to decisions</h2>
          </div>
          <p className="muted">
            Most survey tools stop at charts. Afrimetrica Surveys tells you what the numbers mean and what to do next.
          </p>
        </div>
        <Ticks
          items={[
            {
              title: "Insight cards",
              text: "Your strongest and weakest areas, Net Promoter Score and the biggest gaps between groups, in plain English.",
            },
            {
              title: "Key driver analysis",
              text: "Shows which answers move your headline score most, so you know where to act first.",
            },
            {
              title: "Compare groups",
              text: "Split any question by country, age, gender, occupation or another answer.",
            },
            {
              title: "AI insight report",
              text: "An executive summary, themes from open-text answers and prioritised recommendations.",
            },
          ]}
        />
      </section>

      <section className="stack">
        <div className="section-head">
          <span className="eyebrow">What makes it different</span>
          <h2 className="h2xl">Everything in one place</h2>
        </div>
        <div className="units">
          {[
            [
              "Survey, panel and analysis together",
              "Build the survey, pay real participants and analyse the answers in one account.",
            ],
            [
              "AI question checker",
              "Flags leading, double-barrelled and vague questions before you launch, with better wording.",
            ],
            [
              "Built-in quality control",
              "Attention checks and speed flags hold careless answers for review, so you only pay for good data.",
            ],
            [
              "Face-to-face fieldwork",
              "Upload a questionnaire and get an itemised quote in US dollars for interviews or focus groups.",
            ],
          ].map(([t, d]) => (
            <article key={t} className="card unit">
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
