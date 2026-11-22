"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CourseLines } from "@/components/site/sections";
import { COURSES, FORMATS, GROUPS, SUBJECTS, VENUE_CITIES, group, subjectName } from "@/content/sections";

const PAGE = 12;
const KEYS = ["q", "area", "subject", "venue", "format", "days", "page"] as const;

/** Search and filter the course catalogue. Filters live in the address, so results can be shared and bookmarked. */
export function CourseFinder() {
  const router = useRouter();
  const params = useSearchParams();
  const f = Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ""])) as Record<(typeof KEYS)[number], string>;
  const set = (patch: Partial<typeof f>) => {
    const next = { ...f, page: "", ...patch };
    if (patch.area !== undefined) next.subject = "";
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v));
    router.replace(`/training/finder${qs.size ? `?${qs}` : ""}`, { scroll: false });
  };
  const q = f.q.trim().toLowerCase();
  const list = COURSES.filter(
    (c) =>
      (!f.area || group(f.area)?.subjects.includes(c.cat)) &&
      (!f.subject || c.cat === f.subject) &&
      (!f.days || String(c.days) === f.days) &&
      (!q || [c.title, c.summary, subjectName(c.cat), ...c.objectives].join(" ").toLowerCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const page = Math.min(Math.max(1, Number(f.page) || 1), pages);
  const subjects = f.area
    ? (group(f.area)?.subjects ?? [])
    : Object.keys(SUBJECTS).sort((a, b) => subjectName(a).localeCompare(subjectName(b)));
  return (
    <>
      <section className="card" aria-label="Filters">
        <div className="finder-grid">
          <label>
            Keyword
            <input
              type="search"
              defaultValue={f.q}
              placeholder="e.g. strategy, SPSS, procurement"
              onChange={(e) => set({ q: e.target.value })}
            />
          </label>
          <label>
            Subject area
            <select value={f.area} onChange={(e) => set({ area: e.target.value })}>
              <option value="">All subject areas</option>
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <select value={f.subject} onChange={(e) => set({ subject: e.target.value })}>
              <option value="">All subjects</option>
              {subjects.map((k) => (
                <option key={k} value={k}>
                  {subjectName(k)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Venue
            <select value={f.venue} onChange={(e) => set({ venue: e.target.value })}>
              <option value="">All venues</option>
              {VENUE_CITIES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Format
            <select value={f.format} onChange={(e) => set({ format: e.target.value })}>
              <option value="">All formats</option>
              {FORMATS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Length
            <select value={f.days} onChange={(e) => set({ days: e.target.value })}>
              <option value="">Any length</option>
              <option value="3">3 days</option>
              <option value="5">5 days</option>
            </select>
          </label>
        </div>
        <div>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => router.replace("/training/finder", { scroll: false })}
          >
            Clear filters
          </button>
        </div>
      </section>
      <section className="stack" id="results">
        <p className="hint" role="status">
          {list.length} course{list.length === 1 ? "" : "s"}
          {f.venue && ` · can run in ${f.venue}`}
          {f.format && ` · ${f.format}`}
          {list.length > PAGE && ` · page ${page} of ${pages}`}
        </p>
        <section className="card">
          <CourseLines courses={list.slice((page - 1) * PAGE, page * PAGE)} showSubject />
        </section>
        {pages > 1 && (
          <nav className="pager" aria-label="Result pages">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`btn small${i + 1 === page ? " primary" : ""}`}
                aria-current={i + 1 === page ? "page" : undefined}
                onClick={() => {
                  set({ page: String(i + 1) });
                  document.getElementById("results")?.scrollIntoView();
                }}
              >
                {i + 1}
              </button>
            ))}
          </nav>
        )}
      </section>
    </>
  );
}
