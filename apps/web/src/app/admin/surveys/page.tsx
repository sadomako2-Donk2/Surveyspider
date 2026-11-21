import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { getDb } from "@/lib/db";
import { adminPage } from "@/server/admin-page";
import { adminSurveyTotals } from "@/server/surveys/analysis";

export const metadata: Metadata = { title: "Surveys · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS = { DRAFT: "Draft", LIVE: "Live", CLOSED: "Closed" } as const;

/** Administrators see survey totals only. Answers are visible to each survey's owner and nobody else. */
export default async function AdminSurveys() {
  if (!(await adminPage("/admin/surveys")).allowed) return <NotAllowed />;
  const surveys = await adminSurveyTotals(getDb());
  const live = surveys.filter((s) => s.status === "LIVE").length;
  const responses = surveys.reduce((a, s) => a + s.responses, 0);
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="surveys" />
      <section className="card">
        <dl className="stat-row">
          <div>
            <dt>Surveys</dt>
            <dd>{surveys.length}</dd>
          </div>
          <div>
            <dt>Live now</dt>
            <dd>{live}</dd>
          </div>
          <div>
            <dt>Responses</dt>
            <dd>{responses}</dd>
          </div>
          <div>
            <dt>Researchers</dt>
            <dd>{new Set(surveys.map((s) => s.owner)).size}</dd>
          </div>
        </dl>
        <p className="hint">
          Totals only. Survey answers are visible to each survey&apos;s owner and nobody else, including administrators.
        </p>
        {surveys.length ? (
          <div className="table-wrap">
            <table className="wide stack-table">
              <thead>
                <tr>
                  <th scope="col">Survey</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Status</th>
                  <th scope="col">Responses</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Survey">
                      <b>{s.title || "Untitled survey"}</b>
                      <br />
                      <span className="hint">Version {s.version}</span>
                    </td>
                    <td data-label="Owner">{s.owner}</td>
                    <td data-label="Status">
                      <span className={`pill${s.status === "LIVE" ? " live" : ""}`}>{STATUS[s.status]}</span>
                    </td>
                    <td data-label="Responses" className="n">
                      {s.responses} / {s.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No surveys yet.</p>
        )}
      </section>
    </main>
  );
}
