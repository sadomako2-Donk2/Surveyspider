import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Analyze } from "@/components/analyze/Analyze";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/server/current-user";
import { loadAnalysis } from "@/server/surveys/analysis";
import { latestVersion } from "@/server/surveys/service";

export const metadata: Metadata = { title: "Analyze", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Owner only: loadAnalysis includes the owner in its database query. */
export default async function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=/surveys/${id}/analyze`);
  const a = await loadAnalysis(getDb(), user.id, id);
  if (!a) notFound();
  const title = latestVersion(a.survey).title;
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="mine" />
      <div className="row-between">
        <div className="page-head">
          <span className="eyebrow">Analyze</span>
          <h1>{title}</h1>
        </div>
        <div className="ctas tight">
          <Link className="btn small" href={`/surveys/${id}/responses`}>
            Responses
          </Link>
          <Link className="btn small" href={`/surveys/${id}/edit`}>
            Edit survey
          </Link>
        </div>
      </div>
      {a.questions.length ? (
        <Analyze title={title} questions={a.questions} rows={a.rows} totals={a.totals} versions={a.versions} />
      ) : (
        <section className="card">
          <h2>Publish the survey to start collecting answers</h2>
          <Link className="btn primary" href={`/surveys/${id}/edit`}>
            Open the builder
          </Link>
        </section>
      )}
    </main>
  );
}
