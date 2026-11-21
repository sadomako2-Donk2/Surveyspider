import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { FieldworkStatus } from "@/components/fieldwork/FieldworkStatus";
import { getDb } from "@/lib/db";
import { F2F_METHODS } from "@/lib/fieldwork";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "Paper surveys · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminFieldwork() {
  if (!(await adminPage("/admin/fieldwork")).allowed) return <NotAllowed />;
  const rows = await getDb().fieldworkRequest.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  const won = rows.filter((r) => r.status === "WON").reduce((a, r) => a + r.quoteTotalUsd, 0);
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="fieldwork" />
      <section className="card">
        <div className="row-between">
          <h2>Paper Survey requests</h2>
          <div className="ctas tight">
            <span className="hint">
              {rows.length} request{rows.length === 1 ? "" : "s"} · US${won.toLocaleString("en-US")} won
            </span>
            {rows.length > 0 && (
              <a className="btn small" href="/api/admin/fieldwork/csv" download>
                Download CSV
              </a>
            )}
          </div>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="wide stack-table">
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">Client</th>
                  <th scope="col">Project</th>
                  <th scope="col">Quote</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const inp = r.inputs as {
                    method?: keyof typeof F2F_METHODS;
                    country?: string;
                    n?: number;
                    groups?: number;
                  };
                  const q = r.quote as { weeks?: number; resp?: number };
                  const sv = r.surveySnapshot as { title?: string; questions?: unknown[] } | null;
                  return (
                    <tr key={r.id}>
                      <td data-label="Received" className="n">
                        {r.createdAt.toISOString().slice(0, 10)}
                        <br />
                        <span className="hint">{r.ref}</span>
                      </td>
                      <td data-label="Client">
                        <b>{r.name}</b>
                        {r.organisation && <br />}
                        {r.organisation}
                        <br />
                        <a href={`mailto:${r.email}`}>{r.email}</a>
                        {r.phone && <span className="hint"> · {r.phone}</span>}
                      </td>
                      <td data-label="Project">
                        {inp.method ? F2F_METHODS[inp.method] : ""}
                        <br />
                        <span className="hint">
                          {q.resp} {inp.method === "fgd" ? "participants" : "interviews"} · {inp.country} ·{" "}
                          {sv ? `${sv.title} (${sv.questions?.length ?? 0} questions)` : "no questionnaire"}
                          {r.preferredStart && ` · start ${r.preferredStart}`}
                        </span>
                        {r.notes && (
                          <>
                            <br />
                            <span className="hint">“{r.notes}”</span>
                          </>
                        )}
                      </td>
                      <td data-label="Quote" className="n">
                        US${r.quoteTotalUsd.toLocaleString("en-US")}
                        <br />
                        <span className="hint">~{q.weeks} wk</span>
                      </td>
                      <td data-label="Status">
                        <FieldworkStatus id={r.id} status={r.status} label={r.ref} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No requests yet. They appear here when clients send a quote from the Paper surveys page.
          </p>
        )}
      </section>
    </main>
  );
}
