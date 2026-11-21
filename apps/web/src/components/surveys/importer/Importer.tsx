"use client";

import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { DEFAULT_CONSENT, MIN_HOURLY_USD, OPEN_SCREENING, QUESTION_TYPE_LABEL } from "@/lib/surveys";
import { AI_OFF, aiPost } from "@/components/ai/aiFetch";
import { readPastedText, readQuestionnaireFile, ReadError, type ReadResult } from "./readFile";

type State =
  | { status: "idle" }
  | { status: "reading"; file: string }
  | { status: "error"; message: string }
  | { status: "ready"; result: ReadResult };

/** Phase 1's estimate: about 30 seconds a question, and pay of 1.25× the minimum hourly guide, rounded to 5 cents. */
function estimate(n: number) {
  const minutes = Math.max(2, Math.ceil(n * 0.5));
  return { minutes, reward: (Math.ceil(((MIN_HOURLY_USD * 1.25 * minutes) / 60) * 20) / 20).toFixed(2) };
}

export function Importer({ aiOn = false }: { aiOn?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "idle" });
  const [over, setOver] = useState(false);
  const [pasted, setPasted] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  /** Optional: sends the document's text to Claude, which can understand layouts the automatic reader misses. */
  async function readWithAi(r: ReadResult) {
    setAiBusy(true);
    setError("");
    const res = await aiPost<Pick<ReadResult, "title" | "description" | "questions">>("/api/ai/read-questionnaire", {
      text: r.text,
    });
    setAiBusy(false);
    if (!res.ok) return setError(`${res.message} The automatic result is still shown.`);
    setState({
      status: "ready",
      result: {
        ...r,
        method: "ai",
        title: res.data.title || r.title,
        description: res.data.description,
        questions: res.data.questions,
      },
    });
  }

  async function read(file: File) {
    setState({ status: "reading", file: file.name });
    try {
      setState({ status: "ready", result: await readQuestionnaireFile(file) });
    } catch (e) {
      setState({ status: "error", message: e instanceof ReadError ? e.message : "This file couldn't be read." });
    }
  }

  async function create(r: ReadResult) {
    setCreating(true);
    setError("");
    const est = estimate(r.questions.length);
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: r.title,
        description: r.description,
        consentText: DEFAULT_CONSENT,
        questions: r.questions,
        reward: est.reward,
        minutes: est.minutes,
        target: 100,
        screening: OPEN_SCREENING,
        attentionCheck: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    setCreating(false);
    if (!res.ok) return setError(data.message ?? "Couldn't create the survey.");
    router.push(`/surveys/${data.id}/edit?imported=${r.questions.length}`);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void read(f);
  };

  if (state.status === "ready") {
    const r = state.result,
      n = r.questions.length;
    return (
      <section className="card">
        <div>
          <span className="eyebrow">
            {r.method === "excel"
              ? "Imported from an Afrimetrica Excel file"
              : r.method === "ai"
                ? "Read by AI · check every question"
                : "Read automatically"}
          </span>
          <h2>
            Found {n} question{n === 1 ? "" : "s"} in {r.file}
          </h2>
        </div>
        {n > 0 ? (
          <>
            <dl className="kv">
              <div className="kv-row">
                <dt>Title</dt>
                <dd>{r.title}</dd>
              </div>
              {r.description && (
                <div className="kv-row">
                  <dt>Intro</dt>
                  <dd>{r.description}</dd>
                </div>
              )}
            </dl>
            <ol className="found">
              {r.questions.map((q, i) => (
                <li key={i}>
                  <span className="q-num">Q{i + 1}</span>
                  <div>
                    <div>{q.text}</div>
                    {q.options.length > 0 && (
                      <div className="opts-mini">
                        {q.options.map((o) => (
                          <span key={o}>{o}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="pill">
                    {q.type === "RATING" && q.scale
                      ? `Rating ${q.scale.min}–${q.scale.max}`
                      : QUESTION_TYPE_LABEL[q.type]}
                  </span>
                </li>
              ))}
            </ol>
            <p className="hint">
              You can fix any question type, wording or option in the next step. Nothing is published until you choose
              to.
            </p>
          </>
        ) : (
          <p className="muted">
            No questions were recognised. Check that the questions are numbered (1. 2. 3.) or end with a question mark.
          </p>
        )}
        {error && (
          <p className="errs" role="alert">
            {error}
          </p>
        )}
        <div className="ctas tight">
          {n > 0 && (
            <button className="btn primary" type="button" disabled={creating} onClick={() => create(r)}>
              {creating ? "Creating…" : "Create survey from these questions"}
            </button>
          )}
          {r.method === "auto" && r.text && (
            <button className="btn" type="button" disabled={!aiOn || aiBusy || creating} onClick={() => readWithAi(r)}>
              {aiBusy ? "Claude is reading…" : "Read it with AI instead"}
            </button>
          )}
          <button className="btn ghost" type="button" onClick={() => setState({ status: "idle" })}>
            Upload a different file
          </button>
        </div>
        {r.method === "auto" && r.text && (
          <p className="hint">
            {aiOn
              ? "If questions are missing or split wrongly, AI reading can help. It sends the file's text to Claude (Anthropic); the file itself stays on your computer."
              : AI_OFF}
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="stack">
      <label
        className={`drop${over ? " over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <b>Drop your questionnaire here</b>
        <span className="muted">or click to choose a file from your computer</span>
        <span className="pills">
          <span className="pill">Word .docx</span>
          <span className="pill">PDF</span>
          <span className="pill">Excel .xlsx</span>
          <span className="pill">Text .txt</span>
        </span>
        <input
          className="sr-only"
          type="file"
          aria-label="Choose a questionnaire file"
          accept=".docx,.pdf,.xlsx,.csv,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = "";
          }}
        />
      </label>
      {state.status === "reading" && (
        <p className="notice" role="status">
          Reading {state.file}…
        </p>
      )}
      {state.status === "error" && (
        <p className="errs" role="alert">
          {state.message}
        </p>
      )}
      <details className="card">
        <summary>Or paste the questions as text</summary>
        <div className="stack paste">
          <label>
            Questions
            <textarea
              rows={8}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={
                "1. How often do you shop online?\na) Daily\nb) Weekly\nc) Monthly\n\n2. What would make you shop online more?"
              }
            />
          </label>
          <button
            className="btn"
            type="button"
            onClick={() =>
              pasted.trim().length < 10
                ? setState({ status: "error", message: "Paste your questions into the box first." })
                : setState({ status: "ready", result: readPastedText(pasted) })
            }
          >
            Read pasted text
          </button>
        </div>
      </details>
    </div>
  );
}
