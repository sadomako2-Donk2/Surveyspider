import type { Metadata } from "next";
import Link from "next/link";
import { DeleteDraft } from "@/components/surveys/ParticipantControls";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { getDb } from "@/lib/db";
import { signedInPage } from "@/server/surveys/pages";

export const metadata: Metadata = { title: "My surveys", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS = { DRAFT: "Draft", LIVE: "Live", CLOSED: "Closed" } as const;

export default async function MySurveys() {
  const user = await signedInPage("/surveys/mine");
  const surveys = await getDb().survey.findMany({
    where: { ownerId: user.id },
    include: {
      versions: { orderBy: { number: "desc" }, take: 1, select: { title: true } },
      _count: { select: { responses: { where: { isTest: false, status: { not: "REJECTED" } } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="mine" />
      <div className="row-between">
        <div className="page-head">
          <span className="eyebrow">Afrimetrica Surveys</span>
          <h1>My surveys</h1>
        </div>
        <Link className="btn primary" href="/surveys/new">
          Create a survey
        </Link>
      </div>
      {surveys.length ? (
        <div className="table-wrap card">
          <table className="wide stack-table">
            <thead>
              <tr>
                <th scope="col">Survey</th>
                <th scope="col">Status</th>
                <th scope="col">Responses</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s) => (
                <tr key={s.id}>
                  <td data-label="Survey">
                    <Link href={`/surveys/${s.id}/edit`}>
                      <b>{s.versions[0]?.title || "Untitled survey"}</b>
                    </Link>
                  </td>
                  <td data-label="Status">
                    <span className={`pill${s.status === "LIVE" ? " live" : ""}`}>{STATUS[s.status]}</span>
                  </td>
                  <td data-label="Responses" className="n">
                    {s._count.responses} / {s.targetResponses}
                  </td>
                  <td>
                    <div className="ctas tight">
                      <Link className="btn small" href={`/surveys/${s.id}/edit`}>
                        Edit
                      </Link>
                      {s.status !== "DRAFT" && (
                        <>
                          <Link className="btn small" href={`/surveys/${s.id}/responses`}>
                            Responses
                          </Link>
                          <Link className="btn small" href={`/surveys/${s.id}/analyze`}>
                            Analyze
                          </Link>
                        </>
                      )}
                      {s.status === "DRAFT" && !s.launchedAt && <DeleteDraft id={s.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="card">
          <h2>No surveys yet</h2>
          <p className="muted">Start from a template or a blank survey.</p>
          <Link className="btn primary" href="/surveys/new">
            Create a survey
          </Link>
        </section>
      )}
    </main>
  );
}
