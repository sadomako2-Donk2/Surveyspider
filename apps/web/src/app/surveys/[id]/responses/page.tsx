import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CopyLink, ReviewSelect, SurveyStatusButtons } from "@/components/surveys/ParticipantControls";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { getDb } from "@/lib/db";
import { ATTENTION } from "@/lib/surveys";
import { ownerPage } from "@/server/surveys/pages";
import { countingResponses, latestVersion, publishedVersion, questionView } from "@/server/surveys/service";

export const metadata: Metadata = { title: "Responses", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The site's own address: PUBLIC_URL / Render's address when set, otherwise the address this page was requested on. */
async function requestOrigin() {
  const configured = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null ? "—" : String(v));
const mmss = (s: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

/** Only the survey's owner reaches this page (ownerPage); site administrators have no access to answers. */
export default async function Responses({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const { id } = await params;
  const { survey } = await ownerPage(id, `/surveys/${id}/responses`);
  if (!survey) notFound();
  const db = getDb();
  const live = publishedVersion(survey);
  const rows = await db.response.findMany({
    where: { surveyId: id },
    include: { answers: true, surveyVersion: { select: { number: true } } },
    orderBy: { submittedAt: "asc" },
  });
  const questions = new Map(
    survey.versions.flatMap((v) => v.questions.map((q) => [q.id, { ...questionView(q), version: v.number }])),
  );
  const counting = await countingResponses(db, id);
  const { published } = await searchParams;
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="mine" />
      {published && <p className="notice">Version {published} is live. Share the link below.</p>}
      <div className="row-between">
        <div className="page-head">
          <span className="eyebrow">Responses</span>
          <h1>{latestVersion(survey).title}</h1>
        </div>
        <div className="ctas tight">
          <Link className="btn small primary" href={`/surveys/${id}/analyze`}>
            Analyze
          </Link>
          <Link className="btn small" href={`/surveys/${id}/edit`}>
            Edit survey
          </Link>
          <SurveyStatusButtons id={id} status={survey.status} />
        </div>
      </div>
      <section className="card">
        <div className="kpis">
          <div className="stat">
            <b>
              {counting} / {survey.targetResponses}
            </b>
            <span className="hint">Responses counted</span>
          </div>
          <div className="stat">
            <b>{rows.filter((r) => r.status === "FLAGGED").length}</b>
            <span className="hint">Waiting for review</span>
          </div>
          <div className="stat">
            <b>{live ? `v${live.number}` : "—"}</b>
            <span className="hint">Live version</span>
          </div>
          <div className="stat">
            <b>{survey.status === "LIVE" ? "Open" : survey.status === "CLOSED" ? "Closed" : "Draft"}</b>
            <span className="hint">Status</span>
          </div>
        </div>
        {survey.status === "LIVE" && (
          <div>
            <span className="hint">Share this link with participants:</span>
            <CopyLink url={`${await requestOrigin()}/s/${id}`} />
          </div>
        )}
      </section>
      <section className="card">
        <h2>Answers</h2>
        <p className="hint">
          Participants are shown as P001, P002… Their names and emails are never shown. Flagged answers failed the
          attention check or were much faster than expected; approve or reject them.
        </p>
        {rows.length ? (
          <div className="stack">
            {rows.map((r, i) => (
              <details key={r.id} className="response">
                <summary>
                  <b>P{String(i + 1).padStart(3, "0")}</b>
                  <span className="hint">
                    {r.submittedAt.toISOString().slice(0, 16).replace("T", " ")} · v{r.surveyVersion.number} ·{" "}
                    {mmss(r.durationSeconds)}
                    {r.isTest && " · test"}
                    {r.passedAttention === false && " · failed attention check"}
                    {r.speeder && " · very fast"}
                  </span>
                  <span className={`pill${r.status === "APPROVED" ? " live" : ""}`}>
                    {r.status === "FLAGGED" ? "Needs review" : r.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                </summary>
                <dl className="kv">
                  {r.answers.map((a) => (
                    <div key={a.id} className="kv-row">
                      <dt>{questions.get(a.questionId)?.text ?? "(question)"}</dt>
                      <dd>{show(a.value)}</dd>
                    </div>
                  ))}
                </dl>
                {!r.isTest && <ReviewSelect id={r.id} status={r.status} label={`P${String(i + 1).padStart(3, "0")}`} />}
              </details>
            ))}
          </div>
        ) : (
          <p className="muted">No responses yet.</p>
        )}
        <p className="hint">
          Charts, statistics and insights are on the Analyze page. The attention check (“
          {ATTENTION.answer}”) is never stored as an answer.
        </p>
      </section>
    </main>
  );
}
