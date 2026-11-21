import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurveyBuilder } from "@/components/surveys/SurveyBuilder";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { getDb } from "@/lib/db";
import { aiEnabled } from "@/server/ai/claude";
import { ownerView } from "@/server/surveys/handlers";
import { ownerPage } from "@/server/surveys/pages";
import { countingResponses } from "@/server/surveys/service";

export const metadata: Metadata = { title: "Edit survey", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditSurvey({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; imported?: string; drafted?: string }>;
}) {
  const { id } = await params;
  const { survey } = await ownerPage(id, `/surveys/${id}/edit`);
  if (!survey) notFound();
  const q = await searchParams;
  const v = ownerView(survey, { responses: await countingResponses(getDb(), id) });
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="mine" />
      <div className="page-head">
        <span className="eyebrow">Edit survey</span>
        <h1>{v.title || "Untitled survey"}</h1>
      </div>
      {q.saved && <p className="notice">Draft saved. Keep editing, or publish when you&apos;re ready.</p>}
      {q.imported && (
        <p className="notice">
          Imported {q.imported} questions as a draft. Check each question&apos;s type and answer options, set your
          audience and pay, then publish. The time estimate and reward were set from the number of questions.
        </p>
      )}
      {q.drafted && (
        <p className="notice">
          Drafted by AI from your description: {q.drafted} questions. Read every question before you publish, and use
          the AI question checker for a second opinion. The time estimate and reward were set from the draft.
        </p>
      )}
      <SurveyBuilder initial={v} aiOn={aiEnabled()} />
    </main>
  );
}
