import type { Metadata } from "next";
import Link from "next/link";
import { SurveyBuilder } from "@/components/surveys/SurveyBuilder";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { DEFAULT_CONSENT, OPEN_SCREENING, SURVEY_TEMPLATES } from "@/lib/surveys";
import { signedInPage } from "@/server/surveys/pages";

export const metadata: Metadata = { title: "Create a survey", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewSurvey({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  await signedInPage(`/surveys/new${template ? `?template=${template}` : ""}`);
  const t = SURVEY_TEMPLATES.find((x) => x.key === template);
  if (!template)
    return (
      <main id="main" className="wrap stack">
        <SurveysNav current="new" />
        <div className="page-head">
          <span className="eyebrow">New survey</span>
          <h1>How would you like to start?</h1>
        </div>
        {(
          [
            ["research", "Research templates"],
            ["train", "Training and development toolkit"],
          ] as const
        ).map(([group, heading]) => (
          <section key={group} className="stack">
            <h2>{heading}</h2>
            <div className="course-grid">
              {SURVEY_TEMPLATES.filter((x) => x.group === group).map((x) => (
                <Link key={x.key} className="card guide-link" href={`/surveys/new?template=${x.key}`}>
                  <h3>{x.name}</h3>
                  <p className="muted">{x.blurb}</p>
                  <span className="hint">
                    {x.questions.length} questions · {x.minutes} min
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        <section className="stack">
          <h2>Or</h2>
          <div className="course-grid">
            <Link className="card guide-link" href="/surveys/new?template=blank">
              <h3>Blank survey</h3>
              <p className="muted">Write every question yourself.</p>
            </Link>
          </div>
        </section>
      </main>
    );
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="new" />
      <div className="page-head">
        <span className="eyebrow">New survey{t ? ` · from “${t.name}”` : ""}</span>
        <h1>Build your survey</h1>
      </div>
      <SurveyBuilder
        initial={{
          status: "DRAFT",
          title: t?.title ?? "",
          description: t?.description ?? "",
          consentText: DEFAULT_CONSENT,
          questions: t?.questions ?? [
            { type: "SINGLE", text: "", options: ["Option 1", "Option 2"], scale: null, required: true },
          ],
          reward: (t?.reward ?? 1).toFixed(2),
          target: t?.target ?? 100,
          minutes: t?.minutes ?? 10,
          screening: { ...OPEN_SCREENING, occupations: t?.occupations ?? [] },
          attentionCheck: true,
          responses: 0,
        }}
      />
    </main>
  );
}
