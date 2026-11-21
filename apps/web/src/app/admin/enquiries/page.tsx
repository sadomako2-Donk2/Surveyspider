import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { EnquiryStatusSelect } from "@/components/enquiries/AdminControls";
import { getDb } from "@/lib/db";
import {
  ENQUIRY_STATUS_LABEL,
  ENQUIRY_STATUSES,
  ENQUIRY_TYPE_LABEL,
  ENQUIRY_TYPES,
  type EnquiryStatusCode,
  type EnquiryTypeCode,
} from "@/lib/enquiries";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "Enquiries · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Enquiries({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  if (!(await adminPage("/admin/enquiries")).allowed) return <NotAllowed />;
  const q = await searchParams;
  const type = ENQUIRY_TYPES.includes(q.type as EnquiryTypeCode) ? (q.type as EnquiryTypeCode) : undefined;
  const status = ENQUIRY_STATUSES.includes(q.status as EnquiryStatusCode) ? (q.status as EnquiryStatusCode) : undefined;
  const db = getDb();
  const [rows, newCount] = await Promise.all([
    db.enquiry.findMany({ where: { type, status }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.enquiry.count({ where: { status: "NEW" } }),
  ]);
  const qs = new URLSearchParams({ ...(type ? { type } : {}), ...(status ? { status } : {}) }).toString();
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="enquiries" />
      <section className="card">
        <div className="row-between">
          <h2>Enquiries {newCount > 0 && <span className="pill live">{newCount} new</span>}</h2>
          <div className="ctas tight">
            <form className="ctas tight">
              <label className="inline">
                Type
                <select name="type" defaultValue={type ?? ""}>
                  <option value="">All</option>
                  {ENQUIRY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ENQUIRY_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline">
                Status
                <select name="status" defaultValue={status ?? ""}>
                  <option value="">All</option>
                  {ENQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ENQUIRY_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn small" type="submit">
                Show
              </button>
            </form>
            {rows.length > 0 && (
              <a className="btn small" href={`/api/admin/enquiries/csv${qs ? `?${qs}` : ""}`} download>
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
                  <th scope="col">From</th>
                  <th scope="col">Enquiry</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Received" className="n">
                      {e.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                      <br />
                      <span className="pill">{ENQUIRY_TYPE_LABEL[e.type]}</span>
                    </td>
                    <td data-label="From">
                      <b>{e.name}</b>
                      <br />
                      <a href={`mailto:${e.email}`}>{e.email}</a>
                      {e.phone && <span className="hint"> · {e.phone}</span>}
                      {e.organisation && (
                        <>
                          <br />
                          <span className="hint">{e.organisation}</span>
                        </>
                      )}
                    </td>
                    <td data-label="Enquiry">
                      {e.subject && (
                        <>
                          <b>{e.subject}</b>
                          <br />
                        </>
                      )}
                      {(e.service || e.timeline || e.budget) && (
                        <>
                          <span className="hint">{[e.service, e.timeline, e.budget].filter(Boolean).join(" · ")}</span>
                          <br />
                        </>
                      )}
                      <span className="pre">{e.message}</span>
                    </td>
                    <td data-label="Status">
                      <EnquiryStatusSelect id={e.id} status={e.status} label={e.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No enquiries{type || status ? " match these filters" : " yet"}.</p>
        )}
      </section>
    </main>
  );
}
