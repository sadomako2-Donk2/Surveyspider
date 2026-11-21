"use client";

import { useState } from "react";
import { ANALYST_SUGGESTIONS, type AiReport } from "@/lib/ai";
import { MIN_GROUP } from "@/lib/analysis";
import { AI_OFF, aiPost } from "./aiFetch";

/** The Analyze page's current view, sent so the AI works on the same responses the person is looking at. */
export interface AiFilter {
  includeFlagged: boolean;
  key: string;
  value: string;
}

const privacyNote = `A summary of the responses in this view, including written answers, is sent to Claude (Anthropic) to answer. Participant codes and accounts are never sent, and groups under ${MIN_GROUP} people are not listed.`;

export function AiAnalyst({
  surveyId,
  aiOn,
  filter,
  responses,
}: {
  surveyId: string;
  aiOn: boolean;
  filter: AiFilter;
  responses: number;
}) {
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canAsk = aiOn && !busy && responses > 0;

  async function ask(text: string) {
    const question = text.trim();
    if (!question || !canAsk) return;
    const next = [...msgs, { role: "user" as const, content: question }];
    setMsgs(next);
    setQ("");
    setBusy(true);
    setError("");
    const r = await aiPost<{ text: string; truncated: boolean }>(`/api/surveys/${surveyId}/ai/ask`, {
      messages: next.slice(-12),
      filter,
    });
    setBusy(false);
    if (!r.ok) {
      setMsgs(msgs); // take the question back out so it can be asked again
      setQ(question);
      return setError(r.message);
    }
    setMsgs([...next, { role: "assistant", content: r.data.text + (r.data.truncated ? " …" : "") }]);
  }

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <span className="eyebrow">AI research analyst</span>
          <h2>Ask anything about these {responses} responses</h2>
        </div>
        {msgs.length > 0 && !busy && (
          <button type="button" className="btn small ghost" onClick={() => setMsgs([])}>
            New conversation
          </button>
        )}
      </div>
      <div className="msgs" aria-live="polite">
        {msgs.length === 0 && !busy ? (
          <p className="muted">
            The analyst works only from your survey data, with the current filter. It quotes numbers, tells you when the
            data can&apos;t answer a question, and remembers the conversation so you can ask follow-ups.
          </p>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <span className="sr-only">{m.role === "user" ? "You:" : "Analyst:"} </span>
              {m.content}
            </div>
          ))
        )}
        {busy && <div className="msg assistant">Thinking…</div>}
      </div>
      <div className="pills">
        {ANALYST_SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="btn small" disabled={!canAsk} onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="filter-row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <input
          aria-label="Your question"
          maxLength={400}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Do online attendees feel differently about the facilitator?"
        />
        <button type="submit" className="btn primary" disabled={!canAsk || !q.trim()}>
          {busy ? "Thinking…" : "Send"}
        </button>
      </form>
      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      <p className="hint">{aiOn ? privacyNote : AI_OFF}</p>
    </section>
  );
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function AiReportPanel({
  surveyId,
  aiOn,
  filter,
  responses,
  initial,
}: {
  surveyId: string;
  aiOn: boolean;
  filter: AiFilter;
  responses: number;
  initial: AiReport | null;
}) {
  const [rep, setRep] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function write() {
    setBusy(true);
    setError("");
    const r = await aiPost<{ report: AiReport }>(`/api/surveys/${surveyId}/ai/report`, { filter });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setRep(r.data.report);
  }

  const button = (
    <button type="button" className={`btn ${rep ? "" : "gold"}`} disabled={!aiOn || busy || !responses} onClick={write}>
      {busy ? "Writing your report…" : rep ? "Write a new report" : "Write my insight report"}
    </button>
  );
  const errs = error && (
    <p className="errs" role="alert">
      {error}
    </p>
  );
  if (busy || !rep)
    return (
      <section className="card">
        <span className="eyebrow">AI insight report</span>
        <h2>Turn {responses} responses into a report you can share</h2>
        <p className="muted">
          Claude reads your results, scores and written answers and writes an executive summary, key findings, themes
          and prioritised recommendations.
        </p>
        {busy && (
          <p role="status">
            Claude is reading {responses} responses and writing your report. This can take up to a minute.
          </p>
        )}
        {errs}
        <div className="ctas tight">{button}</div>
        <p className="hint">{aiOn ? privacyNote : AI_OFF}</p>
      </section>
    );
  const tone = (p: string) => (p === "high" ? "warn" : p === "low" ? "good" : "info");
  return (
    <div className="stack">
      <section className="card">
        <span className="eyebrow">
          AI insight report · {date(rep.generatedAt)} · {rep.responses} responses ({rep.basis})
        </span>
        <h2>{rep.headline}</h2>
        <p>{rep.summary}</p>
        <p className="hint">
          Written by AI from your data. Check the figures against the Summary tab before you share it.
        </p>
        {errs}
        <div className="ctas tight">{button}</div>
      </section>
      <div className="split">
        <section className="card">
          <h2>Key findings</h2>
          <ol className="stack tight">
            {rep.findings.map((f, i) => (
              <li key={i}>
                <b>{f.title}</b>
                <p>{f.detail}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <h2>Recommendations</h2>
          {rep.recommendations.map((r, i) => (
            <div key={i} className="insight stack">
              <span className={`tag ${tone(r.priority)}`}>{r.priority} priority</span>
              <b>{r.action}</b>
              <p>{r.why}</p>
            </div>
          ))}
        </section>
      </div>
      {rep.themes.length > 0 && (
        <section className="card">
          <h2>Themes in written answers</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Theme</th>
                  <th>How common</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                {rep.themes.map((t, i) => (
                  <tr key={i}>
                    <td>
                      <b>{t.theme}</b>
                    </td>
                    <td>{t.share}</td>
                    <td className="muted">{t.quote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {rep.caveats.length > 0 && (
        <section className="card">
          <h2>Read with care</h2>
          <ul>
            {rep.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
