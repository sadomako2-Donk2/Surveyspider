"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ATTENTION, type QuestionInput } from "@/lib/surveys";

interface Props {
  surveyId: string;
  versionId: string;
  title: string;
  description: string;
  consentText: string;
  questions: (QuestionInput & { id: string })[];
  attentionCheck: boolean;
  test: boolean;
}

/** Time spent answering, measured from when the page opened. */
const secondsSince = (start: number) => Math.round((Date.now() - start) / 1000);

type Shown = (QuestionInput & { id: string }) & { attention?: boolean };

export function TakeSurvey({
  surveyId,
  versionId,
  title,
  description,
  consentText,
  questions,
  attentionCheck,
  test,
}: Props) {
  const started = useRef(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { status: string; test: boolean }>(null);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  // The attention check sits in the middle of the survey, as in Phase 1.
  const shown: Shown[] = [...questions];
  if (attentionCheck)
    shown.splice(Math.ceil(questions.length / 2), 0, {
      id: ATTENTION.key,
      type: "SINGLE",
      text: ATTENTION.text,
      options: [...ATTENTION.options],
      required: true,
      attention: true,
    });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const answers: Record<string, unknown> = {};
    const missing: number[] = [];
    shown.forEach((q, i) => {
      let v: unknown;
      if (q.type === "MULTI") v = f.getAll(q.id);
      else if (q.type === "RATING") v = f.get(q.id) ? Number(f.get(q.id)) : null;
      else v = String(f.get(q.id) ?? "").trim() || null;
      const empty = v == null || (Array.isArray(v) && !v.length);
      if (empty && q.required) missing.push(i + 1);
      if (!empty) answers[q.id] = v;
    });
    if (missing.length)
      return setError(`Please answer question${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`);
    if (!f.get("consent")) return setError("Tick the consent box to take part.");
    setBusy(true);
    setError("");
    const r = await fetch(`/api/surveys/${surveyId}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionId,
        consent: true,
        answers,
        durationSeconds: secondsSince(started.current),
      }),
    });
    const data = (await r.json().catch(() => ({}))) as { message?: string; status?: string; test?: boolean };
    setBusy(false);
    if (!r.ok) return setError(data.message ?? "Your answers couldn't be sent. Please try again.");
    setDone({ status: data.status ?? "", test: !!data.test });
    window.scrollTo(0, 0);
  }

  if (done)
    return (
      <section className="card" role="status">
        <span className="eyebrow">Answers sent</span>
        <h1>Thank you for taking part</h1>
        <p className="muted">
          {done.test
            ? "This was a test response from the survey's owner. It's kept separately and doesn't count towards the target."
            : done.status === "FLAGGED"
              ? "Your answers were received and will be reviewed by the researcher before any reward is approved."
              : "Your answers were received."}
        </p>
        <div className="ctas tight">
          <Link className="btn primary" href="/surveys/take">
            Find more surveys
          </Link>
          <Link className="btn" href="/account">
            My Account
          </Link>
        </div>
      </section>
    );

  return (
    <form className="stack take" onSubmit={submit} onChange={() => error && setError("")} noValidate>
      <header className="card">
        <span className="eyebrow">Survey</span>
        <h1>{title}</h1>
        {description && <p className="muted pre">{description}</p>}
        {test && (
          <p className="notice">
            You own this survey. Your answers are a test and won&apos;t count towards the target.
          </p>
        )}
      </header>
      {shown.map((q, i) => (
        <fieldset key={q.id} className="card q-take">
          <legend>
            {i + 1}. {q.text}
            {q.required && (
              <span className="req" aria-label="required">
                {" "}
                *
              </span>
            )}
          </legend>
          {(q.type === "SINGLE" || q.type === "MULTI") && (
            <div className="opts">
              {q.options.map((o) => (
                <label key={o} className="opt">
                  <input type={q.type === "SINGLE" ? "radio" : "checkbox"} name={q.id} value={o} />
                  {o}
                </label>
              ))}
            </div>
          )}
          {q.type === "LIKERT" && (
            <div className="scale likert" style={{ ["--n" as string]: q.options.length }}>
              {q.options.map((o) => (
                <label key={o} className="opt">
                  <input type="radio" name={q.id} value={o} />
                  {o}
                </label>
              ))}
            </div>
          )}
          {q.type === "RATING" && q.scale && (
            <div>
              <div className="scale" style={{ ["--n" as string]: q.scale.max - q.scale.min + 1 }}>
                {Array.from({ length: q.scale.max - q.scale.min + 1 }, (_, j) => q.scale!.min + j).map((n) => (
                  <label key={n} className="opt">
                    <input type="radio" name={q.id} value={n} />
                    {n}
                  </label>
                ))}
              </div>
              <div className="scale-ends hint">
                <span>
                  {q.scale.min} · {q.scale.minLabel}
                </span>
                <span>
                  {q.scale.max} · {q.scale.maxLabel}
                </span>
              </div>
            </div>
          )}
          {q.type === "NUMBER" && (
            <input
              type="number"
              step="any"
              inputMode="decimal"
              name={q.id}
              aria-label={`Answer to question ${i + 1}`}
            />
          )}
          {q.type === "TEXT" && (
            <textarea name={q.id} rows={3} maxLength={1000} aria-label={`Answer to question ${i + 1}`} />
          )}
        </fieldset>
      ))}
      <section className="card">
        <label className="inline consent">
          <input type="checkbox" name="consent" />
          <span>{consentText}</span>
        </label>
        {error && (
          <p className="errs" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary big" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Submit my answers"}
        </button>
      </section>
    </form>
  );
}
