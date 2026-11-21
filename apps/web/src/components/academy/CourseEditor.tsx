"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CURRENCIES, FORMATS, LEVELS } from "@/lib/academy";

export interface EditorSession {
  key: string; // stable React key
  id?: string;
  startsOn: string;
  endsOn: string;
  location: string;
  seats: string;
  fee: string;
  currency: string;
  taken: number;
}
export interface EditorCourse {
  id?: string;
  slug?: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  level: string;
  format: string;
  duration: string;
  summary: string;
  description: string;
  outcomes: string;
  audience: string;
  certificate: boolean;
  sessions: EditorSession[];
  registrations: number;
}

let n = 0;
const newSession = (): EditorSession => ({
  key: `new-${n++}`,
  startsOn: "",
  endsOn: "",
  location: "",
  seats: "20",
  fee: "0",
  currency: "USD",
  taken: 0,
});

export function CourseEditor({ initial }: { initial: EditorCourse }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof EditorCourse>(k: K, v: EditorCourse[K]) => setC((x) => ({ ...x, [k]: v }));
  const setS = (i: number, k: keyof EditorSession, v: string) =>
    setC((x) => ({ ...x, sessions: x.sessions.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!c.title.trim()) return setError("Give the course a title.");
    setBusy(true);
    setError("");
    setSaved("");
    const body = {
      ...c,
      outcomes: c.outcomes
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      sessions: c.sessions.map((s) => ({
        id: s.id,
        startsOn: s.startsOn,
        endsOn: s.endsOn,
        location: s.location,
        seats: Number(s.seats || 0),
        fee: s.fee,
        currency: s.currency,
      })),
    };
    const r = await fetch(c.id ? `/api/admin/courses/${c.id}` : "/api/admin/courses", {
      method: c.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    setBusy(false);
    if (!r.ok) return setError(data.message ?? "Couldn't save the course.");
    if (!c.id) {
      router.push(`/admin/courses/${data.id}?saved=1`);
      return;
    }
    setSaved(
      c.status === "PUBLISHED"
        ? "Saved and published."
        : c.status === "ARCHIVED"
          ? "Saved. The course is archived and hidden from the site."
          : "Saved as a draft.",
    );
    router.refresh();
  }

  async function remove() {
    const r = await fetch(`/api/admin/courses/${c.id}`, { method: "DELETE" });
    if (r.ok) {
      router.push("/admin/courses?deleted=1");
      return;
    }
    setConfirmDelete(false);
    setError(((await r.json().catch(() => ({}))) as { message?: string }).message ?? "Couldn't delete.");
  }

  return (
    <form className="stack" onSubmit={save} noValidate>
      <section className="card">
        <div className="row-between">
          <h2>{c.id ? "Course details" : "New course"}</h2>
          <label className="inline">
            Status
            <select value={c.status} onChange={(e) => set("status", e.target.value as EditorCourse["status"])}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived (hidden)</option>
            </select>
          </label>
        </div>
        <label>
          Course title
          <input value={c.title} maxLength={150} onChange={(e) => set("title", e.target.value)} required />
        </label>
        <div className="grid4">
          <label>
            Level
            <select value={c.level} onChange={(e) => set("level", e.target.value)}>
              {LEVELS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Format
            <select value={c.format} onChange={(e) => set("format", e.target.value)}>
              {FORMATS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Duration
            <input
              value={c.duration}
              maxLength={80}
              placeholder="e.g. 2 days"
              onChange={(e) => set("duration", e.target.value)}
            />
          </label>
          <label className="inline end">
            <input type="checkbox" checked={c.certificate} onChange={(e) => set("certificate", e.target.checked)} />
            Certificate of completion
          </label>
        </div>
        <label>
          One-line summary
          <input value={c.summary} maxLength={400} onChange={(e) => set("summary", e.target.value)} />
        </label>
        <label>
          Description (leave a blank line between paragraphs)
          <textarea
            rows={6}
            maxLength={6000}
            value={c.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <label>
          Learning outcomes, one per line
          <textarea rows={4} value={c.outcomes} onChange={(e) => set("outcomes", e.target.value)} />
        </label>
        <label>
          Who it&apos;s for
          <input value={c.audience} maxLength={400} onChange={(e) => set("audience", e.target.value)} />
        </label>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Dates and fees</h2>
          <button
            type="button"
            className="btn small"
            onClick={() => setC((x) => ({ ...x, sessions: [...x.sessions, newSession()] }))}
          >
            + Add a date
          </button>
        </div>
        {c.sessions.length ? (
          <div className="ses-edit">
            {c.sessions.map((s, i) => (
              <fieldset key={s.key} className="ses-row">
                <legend>
                  Date {i + 1}
                  {s.taken > 0 && <span className="hint"> · {s.taken} registered</span>}
                </legend>
                <label>
                  Start
                  <input type="date" value={s.startsOn} onChange={(e) => setS(i, "startsOn", e.target.value)} />
                </label>
                <label>
                  End
                  <input type="date" value={s.endsOn} onChange={(e) => setS(i, "endsOn", e.target.value)} />
                </label>
                <label>
                  Venue or link
                  <input
                    value={s.location}
                    maxLength={120}
                    placeholder="e.g. Accra / Zoom"
                    onChange={(e) => setS(i, "location", e.target.value)}
                  />
                </label>
                <label>
                  Seats (0 = no limit)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={s.seats}
                    onChange={(e) => setS(i, "seats", e.target.value)}
                  />
                </label>
                <label>
                  Fee
                  <input inputMode="decimal" value={s.fee} onChange={(e) => setS(i, "fee", e.target.value)} />
                </label>
                <label>
                  Currency
                  <select value={s.currency} onChange={(e) => setS(i, "currency", e.target.value)}>
                    {CURRENCIES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn small ghost danger"
                  disabled={s.taken > 0}
                  title={s.taken > 0 ? "This date has registrations. Cancel them first." : undefined}
                  onClick={() => setC((x) => ({ ...x, sessions: x.sessions.filter((_, j) => j !== i) }))}
                >
                  Remove
                </button>
              </fieldset>
            ))}
          </div>
        ) : (
          <p className="muted">No dates yet. Without dates, visitors can still register their interest.</p>
        )}
      </section>

      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          {saved}
        </p>
      )}
      <div className="ctas tight">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save course"}
        </button>
        {c.slug && c.status === "PUBLISHED" && (
          <a className="btn ghost" href={`/training/${c.slug}`} target="_blank" rel="noopener">
            View on the site
          </a>
        )}
        {c.id &&
          (confirmDelete ? (
            <>
              <button type="button" className="btn danger" onClick={remove}>
                Yes, delete this course
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn ghost danger"
              onClick={() => setConfirmDelete(true)}
              disabled={c.registrations > 0}
              title={c.registrations > 0 ? "Courses with registrations can be archived, not deleted." : undefined}
            >
              Delete course
            </button>
          ))}
      </div>
    </form>
  );
}
