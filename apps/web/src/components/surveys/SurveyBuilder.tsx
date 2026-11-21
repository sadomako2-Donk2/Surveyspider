"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  COUNTRIES,
  DEFAULT_SCALE,
  LIKERT_SETS,
  MIN_HOURLY_USD,
  OCCUPATIONS,
  PLATFORM_FEE,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPES,
  SCALE_PRESETS,
  hourlyRate,
  maxCostMinor,
  questionProblems,
  type QuestionInput,
  type QuestionTypeCode,
  type Screening,
} from "@/lib/surveys";

export interface BuilderSurvey {
  id?: string;
  status: "DRAFT" | "LIVE" | "CLOSED";
  title: string;
  description: string;
  consentText: string;
  questions: QuestionInput[];
  reward: string;
  target: number;
  minutes: number;
  screening: Screening;
  attentionCheck: boolean;
  version?: { number: number; published: boolean; liveNumber: number | null };
  responses: number;
}

type Q = QuestionInput & { key: string };
let k = 0;
const withKey = (q: QuestionInput): Q => ({ ...q, key: `q${k++}` });
const blank = (type: QuestionTypeCode): Q =>
  withKey({
    type,
    text: "",
    options:
      type === "SINGLE" || type === "MULTI"
        ? ["Option 1", "Option 2"]
        : type === "LIKERT"
          ? [...LIKERT_SETS.agree5!.options]
          : [],
    scale: type === "RATING" ? { ...DEFAULT_SCALE } : null,
    required: true,
  });
const usd = (minor: number) =>
  `US$${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SurveyBuilder({ initial }: { initial: BuilderSurvey }) {
  const router = useRouter();
  const [s, setS] = useState({ ...initial, questions: initial.questions.map(withKey) });
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(!initial.id);
  const locked = initial.responses > 0;

  const set = <K extends keyof typeof s>(key: K, v: (typeof s)[K]) => {
    setS((x) => ({ ...x, [key]: v }));
    setDirty(true);
    setNotice("");
  };
  const setQ = (i: number, patch: Partial<Q>) =>
    set(
      "questions",
      s.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)),
    );
  const move = (i: number, d: number) => {
    const qs = [...s.questions];
    [qs[i], qs[i + d]] = [qs[i + d]!, qs[i]!];
    set("questions", qs);
  };

  const rewardMinor = Math.round(Number(s.reward || 0) * 100);
  const hourly = hourlyRate(rewardMinor, s.minutes);
  // What gets saved: blank option lines dropped, no React keys or old ids.
  const cleaned = s.questions.map((q) => ({
    type: q.type,
    text: q.text.trim(),
    options: q.options.map((o) => o.trim()).filter(Boolean),
    scale: q.scale,
    required: q.required,
  }));
  const problems = questionProblems(cleaned);

  async function save(): Promise<string | null> {
    setBusy("save");
    setError("");
    const body = { ...s, questions: cleaned };
    const r = await fetch(s.id ? `/api/surveys/${s.id}` : "/api/surveys", {
      method: s.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { id?: string; message?: string; survey?: BuilderSurvey };
    setBusy("");
    if (!r.ok) {
      setError(data.message ?? "Couldn't save the survey.");
      return null;
    }
    setDirty(false);
    if (!s.id) {
      router.replace(`/surveys/${data.id}/edit?saved=1`);
      return data.id!;
    }
    if (data.survey?.version) setS((x) => ({ ...x, version: data.survey!.version }));
    setNotice(
      data.survey?.version?.published === false && data.survey.version.liveNumber
        ? `Saved as version ${data.survey.version.number}. Publish it to replace the live version.`
        : "Saved.",
    );
    return s.id;
  }

  async function publish() {
    const id = dirty || !s.id ? await save() : s.id;
    if (!id) return;
    setBusy("publish");
    const r = await fetch(`/api/surveys/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = (await r.json().catch(() => ({}))) as { message?: string; version?: number };
    setBusy("");
    if (!r.ok) return setError(data.message ?? "Couldn't publish.");
    router.push(`/surveys/${id}/responses?published=${data.version}`);
  }

  const unpublished = !s.version || !s.version.published;
  return (
    <div className="builder">
      <div className="stack">
        {s.version?.liveNumber && (
          <p className="notice">
            Version {s.version.liveNumber} is live. Questions in a published version never change: your edits become
            version {s.version.published ? s.version.number + 1 : s.version.number}, which replaces it when you publish.
          </p>
        )}
        <section className="card">
          <label>
            Survey title
            <input
              value={s.title}
              maxLength={200}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Course evaluation"
            />
          </label>
          <label>
            Introduction shown to participants
            <textarea
              rows={3}
              maxLength={2000}
              value={s.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label>
            Consent statement (participants tick to agree)
            <textarea
              rows={3}
              maxLength={2000}
              value={s.consentText}
              onChange={(e) => set("consentText", e.target.value)}
            />
          </label>
        </section>

        <ol className="q-list" aria-label="Questions">
          {s.questions.map((q, i) => (
            <li key={q.key} className="card q-card">
              <div className="row-between">
                <b>Question {i + 1}</b>
                <div className="ctas tight">
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move question ${i + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={i === s.questions.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move question ${i + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn small ghost danger"
                    onClick={() =>
                      set(
                        "questions",
                        s.questions.filter((_, j) => j !== i),
                      )
                    }
                    aria-label={`Delete question ${i + 1}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <label>
                Question
                <textarea rows={2} maxLength={500} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
              </label>
              <div className="grid2">
                <label>
                  Type
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const type = e.target.value as QuestionTypeCode;
                      const b = blank(type);
                      setQ(i, {
                        type,
                        options:
                          (type === "SINGLE" || type === "MULTI") && q.options.length >= 2 ? q.options : b.options,
                        scale: b.scale,
                      });
                    }}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline end">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => setQ(i, { required: e.target.checked })}
                  />
                  Answer required
                </label>
              </div>
              {q.type === "LIKERT" && (
                <label>
                  Labels
                  <select
                    value={
                      Object.entries(LIKERT_SETS).find(([, v]) => v.options.join("|") === q.options.join("|"))?.[0] ??
                      ""
                    }
                    onChange={(e) => e.target.value && setQ(i, { options: [...LIKERT_SETS[e.target.value]!.options] })}
                  >
                    <option value="">Custom labels</option>
                    {Object.entries(LIKERT_SETS).map(([key, v]) => (
                      <option key={key} value={key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {(q.type === "SINGLE" || q.type === "MULTI" || q.type === "LIKERT") && (
                <label>
                  Answer options, one per line
                  <textarea
                    rows={Math.min(8, Math.max(3, q.options.length))}
                    value={q.options.join("\n")}
                    onChange={(e) => setQ(i, { options: e.target.value.split("\n") })}
                  />
                </label>
              )}
              {q.type === "RATING" && q.scale && (
                <div className="grid4">
                  <label>
                    Scale
                    <select
                      value={`${q.scale.min}-${q.scale.max}`}
                      onChange={(e) => {
                        const [min, max] = e.target.value.split("-").map(Number) as [number, number];
                        setQ(i, { scale: { ...q.scale!, min, max } });
                      }}
                    >
                      {SCALE_PRESETS.map(([a, b]) => (
                        <option key={`${a}-${b}`} value={`${a}-${b}`}>
                          {a}–{b}
                        </option>
                      ))}
                      {!SCALE_PRESETS.some(([a, b]) => a === q.scale!.min && b === q.scale!.max) && (
                        <option value={`${q.scale.min}-${q.scale.max}`}>
                          {q.scale.min}–{q.scale.max}
                        </option>
                      )}
                    </select>
                  </label>
                  <label>
                    Lowest label
                    <input
                      value={q.scale.minLabel}
                      maxLength={60}
                      onChange={(e) => setQ(i, { scale: { ...q.scale!, minLabel: e.target.value } })}
                    />
                  </label>
                  <label>
                    Highest label
                    <input
                      value={q.scale.maxLabel}
                      maxLength={60}
                      onChange={(e) => setQ(i, { scale: { ...q.scale!, maxLabel: e.target.value } })}
                    />
                  </label>
                </div>
              )}
            </li>
          ))}
        </ol>
        <section className="card">
          <b>Add a question</b>
          <div className="ctas tight">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className="btn small"
                onClick={() => set("questions", [...s.questions, blank(t)])}
              >
                + {QUESTION_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="stack side">
        <section className="card">
          <h2>Participants and pay</h2>
          {locked && <p className="hint">People have answered, so only the number of responses can change.</p>}
          <div className="grid2">
            <label>
              Responses wanted
              <input
                type="number"
                min={1}
                step={1}
                value={s.target}
                onChange={(e) => set("target", Number(e.target.value))}
              />
            </label>
            <label>
              Minutes to complete
              <input
                type="number"
                min={1}
                max={240}
                step={1}
                value={s.minutes}
                disabled={locked}
                onChange={(e) => set("minutes", Number(e.target.value))}
              />
            </label>
            <label>
              Reward per person (US$)
              <input
                inputMode="decimal"
                value={s.reward}
                disabled={locked}
                onChange={(e) => set("reward", e.target.value)}
              />
            </label>
          </div>
          {rewardMinor > 0 && (
            <p className={`hint${hourly < MIN_HOURLY_USD ? " warn" : ""}`}>
              About US${hourly.toFixed(2)} an hour
              {hourly < MIN_HOURLY_USD ? `, below the US$${MIN_HOURLY_USD} an hour we recommend` : ""}.
            </p>
          )}
          <dl className="kv">
            <div className="kv-row">
              <dt>Rewards</dt>
              <dd>{usd(rewardMinor * s.target)}</dd>
            </div>
            <div className="kv-row">
              <dt>Platform fee ({Math.round(PLATFORM_FEE * 100)}%)</dt>
              <dd>{usd(rewardMinor * s.target * PLATFORM_FEE)}</dd>
            </div>
            <div className="kv-row">
              <dt>
                <b>Most it can cost</b>
              </dt>
              <dd>
                <b>{usd(maxCostMinor(rewardMinor, s.target))}</b>
              </dd>
            </div>
          </dl>
          <p className="hint">Payments aren&apos;t connected yet, so nothing is charged.</p>
          <label className="inline">
            <input
              type="checkbox"
              checked={s.attentionCheck}
              disabled={locked}
              onChange={(e) => set("attentionCheck", e.target.checked)}
            />
            Add an attention check
          </label>
        </section>
        <section className="card">
          <h2>Who can answer</h2>
          <div className="grid2">
            <label>
              Minimum age
              <input
                type="number"
                min={18}
                max={120}
                value={s.screening.minAge}
                disabled={locked}
                onChange={(e) => set("screening", { ...s.screening, minAge: Number(e.target.value) })}
              />
            </label>
            <label>
              Maximum age
              <input
                type="number"
                min={18}
                max={120}
                value={s.screening.maxAge}
                disabled={locked}
                onChange={(e) => set("screening", { ...s.screening, maxAge: Number(e.target.value) })}
              />
            </label>
          </div>
          {(
            [
              ["countries", "Countries", COUNTRIES],
              ["occupations", "Occupations", OCCUPATIONS],
            ] as const
          ).map(([key, label, list]) => (
            <details key={key}>
              <summary>
                {label} · {s.screening[key].length ? `${s.screening[key].length} selected` : "all"}
              </summary>
              <div className="checks">
                {list.map((x) => (
                  <label key={x} className="inline">
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={s.screening[key].includes(x)}
                      onChange={(e) =>
                        set("screening", {
                          ...s.screening,
                          [key]: e.target.checked ? [...s.screening[key], x] : s.screening[key].filter((y) => y !== x),
                        })
                      }
                    />
                    {x}
                  </label>
                ))}
              </div>
            </details>
          ))}
          <p className="hint">
            With no limits, anyone with the link can answer. Limits use the participant&apos;s profile.
          </p>
        </section>
        <section className="card sticky-actions">
          {problems.length > 0 && (
            <ul className="hint problems">
              {problems.slice(0, 5).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {error && (
            <p className="errs" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <div className="ctas tight">
            <button type="button" className="btn" disabled={!!busy} onClick={save}>
              {busy === "save" ? "Saving…" : dirty ? "Save draft" : "Saved"}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!!busy || problems.length > 0 || (!unpublished && !dirty)}
              onClick={publish}
            >
              {busy === "publish" ? "Publishing…" : s.version?.liveNumber ? "Publish changes" : "Publish survey"}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
