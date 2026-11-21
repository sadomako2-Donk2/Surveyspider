"use client";

import { useState } from "react";
import type { CheckItem } from "@/lib/ai";
import type { QuestionInput } from "@/lib/surveys";
import { AI_OFF, aiPost } from "./aiFetch";

type Q = QuestionInput & { key: string };

/** A second opinion on wording. Suggestions are only applied when the person clicks "Use this wording". */
export function AiChecker(props: {
  aiOn: boolean;
  title: string;
  description: string;
  questions: Q[];
  disabled?: boolean;
  onApply: (key: string, text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<(CheckItem & { key: string; used?: boolean })[] | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    const keys = props.questions.map((q) => q.key);
    const r = await aiPost<{ items: CheckItem[] }>("/api/ai/check-questions", {
      title: props.title,
      description: props.description,
      questions: props.questions.map(({ key: _key, ...q }) => q), // eslint-disable-line @typescript-eslint/no-unused-vars
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setItems(r.data.items.map((it) => ({ ...it, key: keys[it.q - 1]! })));
  }

  const numberOf = (key: string) => props.questions.findIndex((q) => q.key === key) + 1;
  return (
    <section className="card">
      <h2>AI question checker</h2>
      <p className="hint">
        A second opinion on wording: leading, double-barrelled, vague or loaded questions, missing answer options and
        unbalanced scales.
      </p>
      {busy && <p role="status">Checking {props.questions.length} questions…</p>}
      {items &&
        !busy &&
        (items.length ? (
          <ol className="stack tight checks-ai">
            {items.map((it, j) => {
              const n = numberOf(it.key);
              return (
                <li key={j}>
                  <b>{n ? `Q${n}.` : "A deleted question."}</b> {it.issue}
                  {it.rewrite && n > 0 && (
                    <div className="stack tight">
                      <span className="muted">Suggested: {it.rewrite}</span>
                      <button
                        type="button"
                        className="btn small"
                        disabled={it.used || props.disabled}
                        onClick={() => {
                          props.onApply(it.key, it.rewrite);
                          setItems((xs) => xs!.map((x, i) => (i === j ? { ...x, used: true } : x)));
                        }}
                      >
                        {it.used ? "Wording used" : `Use this wording for Q${n}`}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="notice">No problems found. Your questions read clearly.</p>
        ))}
      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn"
        disabled={!props.aiOn || busy || !props.questions.some((q) => q.text.trim())}
        onClick={run}
      >
        {items ? "Check again" : "Check my questions"}
      </button>
      {!props.aiOn && <p className="hint">{AI_OFF}</p>}
    </section>
  );
}
