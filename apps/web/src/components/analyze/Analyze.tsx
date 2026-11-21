"use client";

import { useMemo, useState } from "react";
import {
  MIN_GROUP,
  SEGMENTS,
  compareGroups,
  correlation,
  crosstab,
  defaultOutcome,
  drivers,
  fmtAvg,
  insights,
  isCategoryQ,
  isNumQ,
  isScaleQ,
  isSignificant,
  reliability,
  responseQuality,
  safeGroups,
  scaleMax,
  segValue,
  short,
  significance,
  strength,
  summarise,
  type AQ,
  type ARow,
  type Summary,
} from "@/lib/analysis";
import { describe as describeStats } from "@/lib/stats";
import { QUESTION_TYPE_LABEL, scaleOf } from "@/lib/surveys";
import { AiAnalyst, AiReportPanel } from "@/components/ai/AiAnalysis";
import type { AiReport } from "@/lib/ai";
import { Bars } from "./Bars";

interface Props {
  surveyId: string;
  title: string;
  questions: AQ[];
  rows: ARow[];
  totals: { all: number; flagged: number; rejected: number };
  versions: number[];
  aiOn: boolean;
  report: AiReport | null;
}

const TABS = [
  ["summary", "Summary"],
  ["groups", "Compare groups"],
  ["drivers", "Key drivers"],
  ["stats", "Statistics"],
  ["quality", "Quality"],
  ["analyst", "AI analyst"],
  ["report", "AI report"],
] as const;
type Tab = (typeof TABS)[number][0];

const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: d }) : "–");

export function Analyze({ surveyId, title, questions, rows: allRows, totals, versions, aiOn, report }: Props) {
  const [tab, setTab] = useState<Tab>("summary");
  const [includeFlagged, setIncludeFlagged] = useState(false);
  const [filter, setFilter] = useState({ key: "", value: "" });
  const [busy, setBusy] = useState(false);

  const groupKeys = useMemo(
    () => [
      ...SEGMENTS.map(([k, l]) => [k, l] as [string, string]),
      ...questions
        .filter(isCategoryQ)
        .map((q) => [`q:${q.id}`, `Q${questions.indexOf(q) + 1}. ${short(q.text, 40)}`] as [string, string]),
    ],
    [questions],
  );
  const rows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (includeFlagged || r.status === "APPROVED") &&
          (!filter.key || !filter.value || segValue(r, filter.key) === filter.value),
      ),
    [allRows, includeFlagged, filter],
  );
  const filterValues = filter.key ? safeGroups(allRows, filter.key).groups.map(([n]) => n) : [];
  const filterNote = `${includeFlagged ? "including" : "excluding"} responses waiting for review${filter.key && filter.value ? `; only ${filter.value}` : ""}`;

  if (!allRows.length)
    return (
      <section className="card">
        <h2>No responses yet</h2>
        <p className="muted">
          Charts, statistics and insights appear here as soon as people answer. Answers from your own test runs
          aren&apos;t included.
        </p>
      </section>
    );

  return (
    <div className="stack">
      <section className="card filters" aria-label="Filters">
        <div className="filter-row">
          {totals.flagged > 0 && (
            <label className="inline">
              <input type="checkbox" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} />
              Include {totals.flagged} response{totals.flagged === 1 ? "" : "s"} waiting for review
            </label>
          )}
          <label className="inline">
            Only
            <select value={filter.key} onChange={(e) => setFilter({ key: e.target.value, value: "" })}>
              <option value="">Everyone</option>
              {groupKeys.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {filter.key && (
            <label className="inline">
              is
              <select value={filter.value} onChange={(e) => setFilter({ ...filter, value: e.target.value })}>
                <option value="">Choose…</option>
                {filterValues.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className="btn small"
            disabled={busy || !rows.length}
            onClick={async () => {
              setBusy(true);
              try {
                const { downloadAnalysis } = await import("./exportAnalysis");
                await downloadAnalysis(title, questions, rows, filterNote, totals);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Building…" : "Download Excel"}
          </button>
        </div>
        <p className="hint">
          Analysing <b>{rows.length}</b> response{rows.length === 1 ? "" : "s"}
          {versions.length > 1 && ` from versions ${versions.join(", ")}`}. Your own test answers and {totals.rejected}{" "}
          rejected response{totals.rejected === 1 ? "" : "s"} are left out. Groups of fewer than {MIN_GROUP} people are
          never shown separately.
        </p>
        {filter.key && filterValues.length === 0 && (
          <p className="hint">No group here has {MIN_GROUP} or more people yet, so this filter can&apos;t be used.</p>
        )}
      </section>

      <div className="subtabs" role="tablist" aria-label="Analysis views">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className="subtab"
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {rows.length < 1 ? (
        <p className="muted">No responses match these filters.</p>
      ) : (
        <div role="tabpanel">
          {/* Kept mounted so the conversation and report survive switching tabs. */}
          <div hidden={tab !== "analyst"}>
            <AiAnalyst surveyId={surveyId} aiOn={aiOn} filter={{ includeFlagged, ...filter }} responses={rows.length} />
          </div>
          <div hidden={tab !== "report"}>
            <AiReportPanel
              surveyId={surveyId}
              aiOn={aiOn}
              filter={{ includeFlagged, ...filter }}
              responses={rows.length}
              initial={report}
            />
          </div>
          {tab === "summary" && <SummaryTab questions={questions} rows={rows} totals={totals} />}
          {tab === "groups" && <GroupsTab questions={questions} rows={rows} groupKeys={groupKeys} />}
          {tab === "drivers" && <DriversTab questions={questions} rows={rows} />}
          {tab === "stats" && <StatsTab questions={questions} rows={rows} groupKeys={groupKeys} />}
          {tab === "quality" && (
            <QualityTab
              questions={questions}
              rows={allRows.filter((r) => !filter.key || !filter.value || segValue(r, filter.key) === filter.value)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Summary ----------

function SummaryTab({ questions, rows, totals }: { questions: AQ[]; rows: ARow[]; totals: Props["totals"] }) {
  const cards = insights(questions, rows, { total: totals.all - totals.rejected, flagged: totals.flagged });
  return (
    <div className="stack">
      {cards.length > 0 && (
        <section className="insights" aria-label="Insights">
          {cards.map((c) => (
            <article key={c.label + c.title} className={`card insight ${c.tone}`}>
              <span className={`tag ${c.tone}`}>{c.label}</span>
              <b>{c.title}</b>
              <p className="muted">{c.text}</p>
            </article>
          ))}
        </section>
      )}
      {questions.map((q, i) => (
        <QuestionResult key={q.id} q={q} n={i + 1} s={summarise(q, rows)} />
      ))}
    </div>
  );
}

function QuestionResult({ q, n, s }: { q: AQ; n: number; s: Summary }) {
  const typeLabel =
    q.type === "RATING" ? `Rating ${scaleOf(q.scale).min}–${scaleOf(q.scale).max}` : QUESTION_TYPE_LABEL[q.type];
  return (
    <section className="card q-result" aria-labelledby={`q-${q.id}`}>
      <div className="row-between">
        <h3 id={`q-${q.id}`}>
          {n}. {q.text}
        </h3>
        <span className="pill">{typeLabel}</span>
      </div>
      <p className="hint">
        {s.n} answer{s.n === 1 ? "" : "s"}
        {s.kind === "choice" && s.multi && " · people could choose more than one"}
      </p>
      {s.n === 0 ? (
        <p className="muted">No answers yet.</p>
      ) : s.kind === "choice" ? (
        <>
          <Bars
            caption={`Answers to question ${n}`}
            items={s.counts.map((c) => ({
              label: c.option,
              fraction: c.pct / 100,
              value: `${c.pct}%`,
              detail: `(${c.count})`,
            }))}
          />
          {s.top2 != null && (
            <p className="hint">
              Top-2 box: <b>{s.top2}%</b> chose one of the two most positive answers.
            </p>
          )}
        </>
      ) : s.kind === "numeric" ? (
        <>
          {s.stats && (
            <dl className="stat-row">
              <div>
                <dt>Average</dt>
                <dd>{fmtAvg(q, s.stats.mean)}</dd>
              </div>
              <div>
                <dt>Median</dt>
                <dd>{fmt(s.stats.median)}</dd>
              </div>
              <div>
                <dt>95% confidence</dt>
                <dd>{s.stats.n > 1 ? `${fmt(s.stats.lo)} to ${fmt(s.stats.hi)}` : "–"}</dd>
              </div>
              <div>
                <dt>Range</dt>
                <dd>
                  {fmt(s.stats.min)} to {fmt(s.stats.max)}
                </dd>
              </div>
              {s.nps && (
                <div>
                  <dt>Net Promoter Score</dt>
                  <dd>
                    {s.nps.nps > 0 ? "+" : ""}
                    {s.nps.nps}{" "}
                    <span className="hint">
                      ({s.nps.pro}% promoters, {s.nps.det}% detractors)
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {s.distribution && (
            <Bars
              caption={`Distribution of answers to question ${n}`}
              items={s.distribution.map((d) => ({
                label: `${d.value}${d.value === scaleOf(q.scale).min ? ` · ${scaleOf(q.scale).minLabel}` : d.value === scaleOf(q.scale).max ? ` · ${scaleOf(q.scale).maxLabel}` : ""}`,
                fraction: d.pct / 100,
                value: `${d.pct}%`,
                detail: `(${d.count})`,
              }))}
            />
          )}
        </>
      ) : (
        <details>
          <summary>Read the {s.n} written answers</summary>
          <ul className="text-answers">
            {s.answers.map((a, j) => (
              <li key={j}>{a}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ---------- Compare groups ----------

function GroupsTab({ questions, rows, groupKeys }: { questions: AQ[]; rows: ARow[]; groupKeys: [string, string][] }) {
  const numeric = questions.filter(isNumQ);
  const [qid, setQid] = useState(numeric[0]?.id ?? "");
  const [key, setKey] = useState("country");
  const q = numeric.find((x) => x.id === qid);
  if (!numeric.length) return <p className="muted">Group comparisons need a rating, Likert or number question.</p>;
  const c = q ? compareGroups(q, rows, key) : null;
  const max = q ? (scaleMax(q) ?? Math.max(...(c?.groups.map((g) => g.max) ?? [1]), 1)) : 1;
  const keyLabel = groupKeys.find(([k]) => k === key)?.[1] ?? key;
  return (
    <section className="card">
      <div className="filter-row">
        <label>
          Question
          <select value={qid} onChange={(e) => setQid(e.target.value)}>
            {numeric.map((x) => (
              <option key={x.id} value={x.id}>
                Q{questions.indexOf(x) + 1}. {short(x.text, 60)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Split by
          <select value={key} onChange={(e) => setKey(e.target.value)}>
            {groupKeys
              .filter(([k]) => k !== `q:${qid}`)
              .map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
          </select>
        </label>
      </div>
      {q && c && c.groups.length ? (
        <>
          <Bars
            caption={`Average by ${keyLabel}`}
            items={c.groups.map((g) => ({
              label: g.name,
              fraction: g.mean / max,
              value: fmtAvg(q, g.mean),
              detail: `(${g.n} people)`,
            }))}
          />
          {c.test ? (
            <p className={`result ${isSignificant(c.test.p) ? "sig" : ""}`}>
              {c.test.kind === "welch"
                ? `Welch's t-test: t = ${fmt(c.test.t, 2)}, ${significance(c.test.p)}, Cohen's d = ${fmt(c.test.d, 2)}. `
                : `One-way ANOVA: F(${c.test.d1}, ${c.test.d2}) = ${fmt(c.test.F, 2)}, ${significance(c.test.p)}, η² = ${fmt(c.test.eta2, 2)}. `}
              {isSignificant(c.test.p)
                ? "The groups differ by more than chance would explain."
                : "The difference could be due to chance."}
            </p>
          ) : (
            <p className="hint">A test needs at least two groups with enough answers.</p>
          )}
          {c.hiddenPeople > 0 && (
            <p className="hint">
              {c.hiddenPeople} {c.hiddenPeople === 1 ? "person is" : "people are"} in {c.hiddenGroups} group
              {c.hiddenGroups === 1 ? "" : "s"} smaller than {MIN_GROUP}, so not shown.
            </p>
          )}
        </>
      ) : (
        <p className="muted">No group has {MIN_GROUP} or more people with an answer to this question yet.</p>
      )}
    </section>
  );
}

// ---------- Key drivers ----------

function DriversTab({ questions, rows }: { questions: AQ[]; rows: ARow[] }) {
  const numeric = questions.filter(isNumQ);
  const [out, setOut] = useState(defaultOutcome(questions) ?? "");
  if (numeric.length < 2)
    return (
      <section className="card">
        <h2>Key driver analysis needs two scale questions</h2>
        <p className="muted">
          Add at least two rating, Likert or number questions, for example an overall satisfaction score and the things
          that might affect it.
        </p>
      </section>
    );
  const list = drivers(questions, rows, out);
  return (
    <section className="card">
      <label>
        Headline score
        <select value={out} onChange={(e) => setOut(e.target.value)}>
          {numeric.map((x) => (
            <option key={x.id} value={x.id}>
              Q{questions.indexOf(x) + 1}. {short(x.text, 60)}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        How strongly each answer moves with the headline score (Pearson correlation). A strong link is not proof of
        cause.
      </p>
      <Bars
        caption="Key drivers"
        items={list.map((d) => ({
          label: `Q${questions.indexOf(d.q) + 1}. ${short(d.q.text, 50)}`,
          fraction: d.r == null ? 0 : Math.abs(d.r),
          value: d.r == null ? "Not enough answers" : `r = ${d.r >= 0 ? "+" : "−"}${fmt(Math.abs(d.r), 2)}`,
          detail:
            d.r == null
              ? `(${d.n})`
              : `${strength(d.r)}${d.r < 0 ? ", opposite direction" : ""} · ${significance(d.p!)} · ${d.n} people`,
        }))}
      />
    </section>
  );
}

// ---------- Statistics ----------

const TESTS = [
  ["describe", "Describe a number or scale"],
  ["crosstab", "Cross-tabulation (chi-square)"],
  ["corr", "Correlation between two answers"],
  ["alpha", "Reliability of a set of scale questions"],
] as const;

function StatsTab({ questions, rows, groupKeys }: { questions: AQ[]; rows: ARow[]; groupKeys: [string, string][] }) {
  const numeric = questions.filter(isNumQ),
    scale = questions.filter(isScaleQ);
  const [test, setTest] = useState<(typeof TESTS)[number][0]>("describe");
  const [a, setA] = useState(numeric[0]?.id ?? "");
  const [b, setB] = useState(numeric[1]?.id ?? numeric[0]?.id ?? "");
  const [rk, setRk] = useState(groupKeys[0]?.[0] ?? "age");
  const [ck, setCk] = useState(groupKeys.find(([k]) => k.startsWith("q:"))?.[0] ?? "gender");
  const [items, setItems] = useState<string[]>(scale.map((q) => q.id));
  const qSelect = (value: string, set: (v: string) => void, label: string, list = numeric) => (
    <label>
      {label}
      <select value={value} onChange={(e) => set(e.target.value)}>
        {list.map((x) => (
          <option key={x.id} value={x.id}>
            Q{questions.indexOf(x) + 1}. {short(x.text, 60)}
          </option>
        ))}
      </select>
    </label>
  );
  const keySelect = (value: string, set: (v: string) => void, label: string) => (
    <label>
      {label}
      <select value={value} onChange={(e) => set(e.target.value)}>
        {groupKeys.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  let body: React.ReactNode = null;
  if (test === "describe") {
    const q = numeric.find((x) => x.id === a);
    const vals = q
      ? rows
          .map((r) => r.answers[q.id])
          .map(Number)
          .filter(Number.isFinite)
      : [];
    const d = vals.length ? describeStats(vals) : null;
    body = (
      <>
        {qSelect(a, setA, "Question")}
        {d ? (
          <table className="wide">
            <tbody>
              {(
                [
                  ["People", d.n],
                  ["Mean", d.mean],
                  ["Standard deviation", d.sd],
                  ["Median", d.median],
                  ["Lower quartile", d.q1],
                  ["Upper quartile", d.q3],
                  ["Lowest", d.min],
                  ["Highest", d.max],
                  ["95% CI for the mean", d.n > 1 ? `${fmt(d.lo, 2)} to ${fmt(d.hi, 2)}` : "–"],
                ] as [string, number | string][]
              ).map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td className="n">{typeof v === "number" ? fmt(v, 2) : v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No numeric answers yet.</p>
        )}
      </>
    );
  } else if (test === "crosstab") {
    const x = crosstab(rows, rk, ck);
    body = (
      <>
        <div className="filter-row">
          {keySelect(rk, setRk, "Rows")}
          {keySelect(ck, setCk, "Columns")}
        </div>
        {x.rowLabels.length && x.colLabels.length ? (
          <div className="table-wrap">
            <table className="wide">
              <thead>
                <tr>
                  <th scope="col" />
                  {x.colLabels.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {x.rowLabels.map((r, i) => (
                  <tr key={r}>
                    <th scope="row">{r}</th>
                    {x.table[i]!.map((v, j) => (
                      <td key={j} className="n">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">These answers don&apos;t yet have two groups of {MIN_GROUP} or more people each.</p>
        )}
        {x.test && (
          <p className={`result ${isSignificant(x.test.p) ? "sig" : ""}`}>
            χ²({x.test.df}, N = {x.test.N}) = {fmt(x.test.chi, 2)}, {significance(x.test.p)}, Cramér&apos;s V ={" "}
            {fmt(x.test.v, 2)}.{" "}
            {isSignificant(x.test.p)
              ? "The two are related: the pattern of answers differs between groups more than chance would explain."
              : "No clear relationship: the differences could be due to chance."}
            {x.test.smallShare > 0.2 && " Some expected counts are below 5, so treat this result with caution."}
          </p>
        )}
        <p className="hint">Groups of fewer than {MIN_GROUP} people are left out.</p>
      </>
    );
  } else if (test === "corr") {
    const qa = numeric.find((x) => x.id === a),
      qb = numeric.find((x) => x.id === b);
    const r = qa && qb && qa.id !== qb.id ? correlation(qa, qb, rows) : null;
    body = (
      <>
        <div className="filter-row">
          {qSelect(a, setA, "First question")}
          {qSelect(b, setB, "Second question")}
        </div>
        {r ? (
          <p className={`result ${isSignificant(r.p) ? "sig" : ""}`}>
            Pearson r = {fmt(r.r, 2)} ({strength(r.r).toLowerCase()}), {significance(r.p)}, {r.n} people.{" "}
            {r.r >= 0
              ? "Higher answers to one tend to go with higher answers to the other."
              : "Higher answers to one tend to go with lower answers to the other."}
          </p>
        ) : (
          <p className="muted">
            Choose two different questions with at least 3 people answering both and some variation in the answers.
          </p>
        )}
      </>
    );
  } else {
    const chosen = scale.filter((q) => items.includes(q.id));
    const rel = reliability(chosen, rows);
    body = (
      <>
        <fieldset className="checks">
          <legend>Scale questions to combine</legend>
          {scale.map((q) => (
            <label key={q.id} className="inline">
              <input
                type="checkbox"
                checked={items.includes(q.id)}
                onChange={(e) => setItems(e.target.checked ? [...items, q.id] : items.filter((x) => x !== q.id))}
              />
              Q{questions.indexOf(q) + 1}. {short(q.text, 50)}
            </label>
          ))}
        </fieldset>
        {rel.alpha != null ? (
          <p className="result">
            Cronbach&apos;s α = {fmt(rel.alpha, 3)} ({rel.k} items, {rel.n} complete responses).{" "}
            {rel.alpha >= 0.9
              ? "Excellent reliability."
              : rel.alpha >= 0.8
                ? "Good reliability."
                : rel.alpha >= 0.7
                  ? "Acceptable reliability."
                  : rel.alpha >= 0.6
                    ? "Questionable reliability."
                    : "Poor reliability: these questions don't measure one idea consistently."}
          </p>
        ) : (
          <p className="muted">
            Choose at least two scale questions answered by at least 3 people, with some variation.
          </p>
        )}
      </>
    );
  }
  return (
    <section className="card stack">
      <label>
        Test
        <select value={test} onChange={(e) => setTest(e.target.value as typeof test)}>
          {TESTS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {body}
    </section>
  );
}

// ---------- Quality ----------

function QualityTab({ questions, rows }: { questions: AQ[]; rows: ARow[] }) {
  const scored = rows.map((r) => ({ r, ...responseQuality(questions, r) })).sort((a, b) => a.score - b.score);
  const times = rows.map((r) => r.durationSeconds).filter((x): x is number => x != null);
  const median = times.length ? describeStats(times).median : null;
  return (
    <section className="card stack">
      <dl className="stat-row">
        <div>
          <dt>Approved</dt>
          <dd>{rows.filter((r) => r.status === "APPROVED").length}</dd>
        </div>
        <div>
          <dt>Waiting for review</dt>
          <dd>{rows.filter((r) => r.status === "FLAGGED").length}</dd>
        </div>
        <div>
          <dt>Median time</dt>
          <dd>
            {median == null ? "–" : `${Math.floor(median / 60)}:${String(Math.round(median % 60)).padStart(2, "0")}`}
          </dd>
        </div>
        <div>
          <dt>With quality flags</dt>
          <dd>{scored.filter((s) => s.flags.length).length}</dd>
        </div>
      </dl>
      <div className="table-wrap">
        <table className="wide stack-table">
          <thead>
            <tr>
              <th scope="col">Participant</th>
              <th scope="col">Quality score</th>
              <th scope="col">Flags</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {scored.map(({ r, score, flags }) => (
              <tr key={r.id}>
                <td data-label="Participant">{r.code}</td>
                <td data-label="Quality score" className="n">
                  {score}
                </td>
                <td data-label="Flags">{flags.length ? flags.join("; ") : "None"}</td>
                <td data-label="Status">{r.status === "APPROVED" ? "Approved" : "Waiting for review"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">Approve or reject responses on the Responses page.</p>
    </section>
  );
}
