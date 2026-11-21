import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurveyBuilder } from "@/components/surveys/SurveyBuilder";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { getDb } from "@/lib/db";
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
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { survey } = await ownerPage(id, `/surveys/${id}/edit`);
  if (!survey) notFound();
  const v = ownerView(survey, { responses: await countingResponses(getDb(), id) });
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="mine" />
      <div className="page-head">
        <span className="eyebrow">Edit survey</span>
        <h1>{v.title || "Untitled survey"}</h1>
      </div>
      {(await searchParams).saved && (
        <p className="notice">Draft saved. Keep editing, or publish when you&apos;re ready.</p>
      )}
      <SurveyBuilder initial={v} />
    </main>
  );
}
