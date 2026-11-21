"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { readPastedText, readQuestionnaireFile, ReadError } from "@/components/surveys/importer/readFile";
import {
  AUDIENCE,
  CAPTURE,
  DEFAULT_INPUTS,
  F2F_METHODS,
  REPORTS,
  SETTING,
  URGENCY,
  f2fMinutes,
  f2fQuote,
  f2fReady,
  type FieldworkInputs,
} from "@/lib/fieldwork";
import { COUNTRIES, MIN_HOURLY_USD, PLATFORM_FEE, QUESTION_TYPE_LABEL, type QuestionTypeCode } from "@/lib/surveys";

export interface PricedSurvey {
  title: string;
  source: string;
  questions: { type: QuestionTypeCode; text: string; options: string[] }[];
}

const usd = (x: number) => `US$${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usd0 = (x: number) => `US$${Math.round(x).toLocaleString("en-US")}`;

export function FieldworkQuote({ mySurveys }: { mySurveys: (PricedSurvey & { id: string })[] }) {
  const [F, setF] = useState<FieldworkInputs>(DEFAULT_INPUTS);
  const [survey, setSurvey] = useState<PricedSurvey | null>(null);
  const [reading, setReading] = useState("");
  const [readError, setReadError] = useState("");
  const [pasted, setPasted] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FieldworkInputs>(k: K, v: FieldworkInputs[K]) => setF((x) => ({ ...x, [k]: v }));
  const types = survey ? survey.questions.map((q) => q.type) : null;
  const ready = f2fReady(F, types);
  const q = useMemo(() => (ready ? f2fQuote(F, types) : null), [F, types, ready]);
  const unitName = F.method === "fgd" ? "participant" : F.method === "idi" ? "interview" : "completed interview";

  async function read(file: File) {
    setReading(file.name);
    setReadError("");
    try {
      const r = await readQuestionnaireFile(file);
      if (!r.questions.length)
        setReadError(
          "No questions were recognised in that file. Enter the interview length instead, or paste the questions.",
        );
      else
        setSurvey({
          title: r.title,
          source: r.file,
          questions: r.questions.map((x) => ({ type: x.type, text: x.text, options: x.options })),
        });
    } catch (e) {
      setReadError(e instanceof ReadError ? e.message : "That file couldn't be read.");
    }
    setReading("");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const problems = [
      !v("name") && "Enter your name.",
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email")) && "Enter a valid email address.",
      !f.get("consent") && "Tick the box so we can contact you.",
    ].filter(Boolean);
    if (problems.length) return setError(problems.join(" "));
    setBusy(true);
    setError("");
    const r = await fetch("/api/fieldwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: F,
        survey,
        website: v("website"),
        contact: {
          name: v("name"),
          email: v("email"),
          phone: v("phone"),
          organisation: v("organisation"),
          start: v("start"),
          notes: v("notes"),
          consent: !!f.get("consent"),
        },
      }),
    });
    const data = (await r.json().catch(() => ({}))) as { ref?: string; message?: string };
    setBusy(false);
    if (!r.ok) return setError(data.message ?? "Your request couldn't be sent. Please try again.");
    setSent(data.ref ?? "");
    setRequesting(false);
  }

  async function downloadQuote() {
    if (!q) return;
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Afrimetrica";
    const ws = wb.addWorksheet("Quote", { views: [{ showGridLines: false }] });
    ws.getCell("A1").value = "Face-to-face fieldwork quote";
    ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF10285A" } };
    ws.getCell("A2").value =
      `Afrimetrica · ${F2F_METHODS[F.method]} · ${new Date().toISOString().slice(0, 10)} · valid 30 days · US dollars`;
    ws.getCell("A2").font = { italic: true, size: 9 };
    [
      ["Survey", survey ? survey.title : "Not uploaded"],
      ["Method", F2F_METHODS[F.method]],
      ["Country and setting", `${F.country}, ${SETTING[F.setting][0].toLowerCase()}`],
      ["Audience", AUDIENCE[F.audience][0]],
      [`Minutes per ${F.method === "fgd" ? "group" : "interview"}`, q.mins],
      [
        "Estimated timeline",
        `About ${q.weeks} week${q.weeks > 1 ? "s" : ""} (${q.fieldDays} day${q.fieldDays > 1 ? "s" : ""} of fieldwork)`,
      ],
    ].forEach(([k, val], i) => {
      const row = ws.getRow(4 + i);
      row.values = [k, val];
      row.getCell(1).font = { bold: true };
    });
    const head = ws.getRow(11);
    head.values = ["Item", "Group", "Qty", "Unit price", "Amount"];
    head.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10285A" } };
    });
    const first = 12;
    q.lines.forEach((l, i) => {
      const row = ws.getRow(first + i);
      row.values = [l.label, l.group, l.qty, l.unit];
      row.getCell(5).value = { formula: `C${first + i}*D${first + i}`, result: l.amount };
      row.getCell(4).numFmt = row.getCell(5).numFmt = '"$"#,##0.00';
    });
    const last = first + q.lines.length - 1,
      t = ws.getRow(last + 1);
    t.values = ["Total", "", "", ""];
    t.getCell(5).value = { formula: `SUM(E${first}:E${last})`, result: q.total };
    t.getCell(5).numFmt = '"$"#,##0.00';
    t.font = { bold: true };
    const p = ws.getRow(last + 2);
    p.values = [`Per ${F.method === "fgd" ? "participant" : "interview"}`, "", q.resp, ""];
    p.getCell(5).value = { formula: `E${last + 1}/C${last + 2}`, result: q.per };
    p.getCell(5).numFmt = '"$"#,##0.00';
    ws.getRow(last + 4).values = [
      "Indicative price, excluding local taxes. Confirmed after a short call about sampling and locations.",
    ];
    [62, 16, 10, 14, 16].forEach((w, i) => (ws.getColumn(i + 1).width = w));
    if (survey) {
      const qs = wb.addWorksheet("Questions");
      qs.addRow(["No.", "Question", "Type", "Answer options"]).font = { bold: true };
      survey.questions.forEach((x, i) =>
        qs.addRow([i + 1, x.text, QUESTION_TYPE_LABEL[x.type], x.options.join(" | ")]),
      );
      [6, 70, 18, 50].forEach((w, i) => (qs.getColumn(i + 1).width = w));
    }
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "afrimetrica-fieldwork-quote.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const sel = <K extends "method" | "setting" | "audience" | "capture" | "report" | "urgency">(
    key: K,
    label: string,
    obj: Record<string, string | readonly [string, ...unknown[]]>,
  ) => (
    <label>
      {label}
      <select value={F[key]} onChange={(e) => set(key, e.target.value as FieldworkInputs[K])}>
        {Object.entries(obj).map(([k, v]) => (
          <option key={k} value={k}>
            {typeof v === "string" ? v : v[0]}
          </option>
        ))}
      </select>
    </label>
  );
  const num = (
    key: "n" | "groups" | "perGroup" | "minutes" | "languages" | "incentive",
    label: string,
    props: Record<string, string | number> = {},
  ) => (
    <label>
      {label}
      <input type="number" value={F[key]} onChange={(e) => set(key, e.target.value)} {...props} />
    </label>
  );
  const chk = (key: "backTranslation" | "record" | "transcription", label: string) => (
    <label className="inline">
      <input type="checkbox" checked={F[key]} onChange={(e) => set(key, e.target.checked)} />
      {label}
    </label>
  );
  const onlineReward = q ? Math.ceil(((MIN_HOURLY_USD * 1.25 * Math.max(3, q.mins * 0.7)) / 60) * 20) / 20 : 0;

  return (
    <div className="builder">
      <div className="stack">
        {survey ? (
          <section className="card">
            <div className="row-between">
              <div>
                <span className="eyebrow">Your survey</span>
                <h2>{survey.title || "Uploaded survey"}</h2>
              </div>
              <button type="button" className="btn small ghost" onClick={() => setSurvey(null)}>
                Use a different survey
              </button>
            </div>
            <p className="muted">
              {survey.questions.length} questions · about{" "}
              {f2fMinutes(
                { ...F, minutes: "" },
                survey.questions.map((x) => x.type),
              )}{" "}
              minutes per {F.method === "fgd" ? "group" : "interview"} face to face
            </p>
          </section>
        ) : (
          <section className="stack">
            <label className="drop">
              <b>Upload your questionnaire or interview guide</b>
              <span className="muted">
                Word, PDF, Excel or text. It&apos;s read in your browser and priced instantly.
              </span>
              <input
                className="sr-only"
                type="file"
                aria-label="Choose a questionnaire file"
                accept=".docx,.pdf,.xlsx,.csv,.txt,.md"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void read(f);
                  e.target.value = "";
                }}
              />
            </label>
            {reading && <p className="notice">Reading {reading}…</p>}
            {readError && <p className="errs">{readError}</p>}
            <details className="card">
              <summary>Or paste the questions as text</summary>
              <div className="stack paste">
                <label>
                  Questions
                  <textarea rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const r = readPastedText(pasted);
                    if (r.questions.length)
                      setSurvey({
                        title: r.title,
                        source: "Pasted text",
                        questions: r.questions.map((x) => ({ type: x.type, text: x.text, options: x.options })),
                      });
                    else setReadError("No questions were recognised in the pasted text.");
                  }}
                >
                  Read pasted text
                </button>
              </div>
            </details>
            {mySurveys.length > 0 && (
              <label>
                Or use one of your surveys
                <select value="" onChange={(e) => setSurvey(mySurveys.find((s) => s.id === e.target.value) ?? null)}>
                  <option value="">Choose a survey…</option>
                  {mySurveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || "Untitled"}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
        )}
        <section className="card">
          <h2>Your project</h2>
          {sel("method", "How should we collect the data?", F2F_METHODS)}
          {F.method === "fgd" ? (
            <div className="grid2">
              {num("groups", "Number of groups", { min: 1, max: 60, step: 1 })}
              {num("perGroup", "People per group", { min: 4, max: 12, step: 1 })}
            </div>
          ) : (
            num("n", F.method === "idi" ? "Number of interviews" : "Completed interviews needed", { min: 1, step: 1 })
          )}
          <div className="grid2">
            <label>
              Country
              <select value={F.country} onChange={(e) => set("country", e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {sel("setting", "Where", SETTING)}
          </div>
          {sel("audience", "Who should we interview?", AUDIENCE)}
          <div className="grid2">
            {F.method === "questionnaire" && sel("capture", "Recording answers", CAPTURE)}
            {num("minutes", `Minutes per ${F.method === "fgd" ? "group" : "interview"}`, {
              min: 1,
              max: 240,
              step: 1,
              placeholder: `${f2fMinutes({ ...F, minutes: "" }, types ?? [])} (estimated)`,
            })}
            {num("languages", "Extra languages besides English", { min: 0, max: 10, step: 1 })}
            {num("incentive", "Thank-you payment per person (US$)", { min: 0, max: 500, step: 0.5, placeholder: "0" })}
          </div>
          <div className="stack tight">
            {chk("backTranslation", "Independent back-translation check (when translating)")}
            {F.method === "questionnaire"
              ? chk("record", "Audio-record interviews for quality checks")
              : chk("transcription", "Word-for-word transcripts")}
          </div>
          <div className="grid2">
            {sel("report", "What you get at the end", REPORTS)}
            {sel("urgency", "Timing", URGENCY)}
          </div>
        </section>
      </div>

      <aside className="stack side">
        <section className="card quote" aria-live="polite">
          {!q ? (
            <>
              <h2>Your quote appears here</h2>
              <p className="muted">
                Upload your questionnaire, pick one of your surveys, or enter the interview length, and the price is
                worked out instantly.
              </p>
            </>
          ) : (
            <>
              <div>
                <span className="eyebrow">Instant quote · US dollars</span>
                <div className="quote-total" data-testid="quote-total">
                  {usd0(q.total)}
                </div>
                <span className="hint">
                  {usd(q.per)} per {unitName} · valid 30 days
                </span>
              </div>
              <p className="hint">
                <b>
                  About {q.weeks} week{q.weeks > 1 ? "s" : ""}
                </b>{" "}
                · {q.fieldDays} day{q.fieldDays > 1 ? "s" : ""} of fieldwork · {q.people}
              </p>
              <div className="table-wrap">
                <table className="wide quote-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(q.lines.map((l) => l.group))].map((g) => [
                      <tr key={g} className="qgroup">
                        <th scope="rowgroup" colSpan={3}>
                          {g}
                        </th>
                      </tr>,
                      ...q.lines
                        .filter((l) => l.group === g)
                        .map((l) => (
                          <tr key={l.label}>
                            <td>{l.label}</td>
                            <td className="n">{l.qty.toLocaleString("en-US")}</td>
                            <td className="n">{usd(l.amount)}</td>
                          </tr>
                        )),
                    ])}
                    <tr className="qtotal">
                      <th scope="row" colSpan={2}>
                        Total
                      </th>
                      <td className="n">{usd(q.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {F.method === "questionnaire" && (
                <p className="hint">
                  Running the same survey online with the Afrimetrica Surveys panel would cost about{" "}
                  <b>{usd0(q.n * onlineReward * (1 + PLATFORM_FEE))}</b>. Face-to-face reaches people who aren&apos;t
                  online, can&apos;t read well, or need an interviewer to explain questions.
                </p>
              )}
              <details>
                <summary>What this price assumes</summary>
                <ul className="steps">
                  <li>
                    {q.mins} minutes per {F.method === "fgd" ? "group" : "interview"}
                    {+F.minutes > 0 ? " (your figure)" : survey ? ` (estimated from ${q.qn} questions)` : ""}.
                  </li>
                  <li>
                    {F.country} fieldwork at {q.tier === "A" ? "high-cost" : q.tier === "B" ? "middle" : "standard"}{" "}
                    market rates, {SETTING[F.setting][0].toLowerCase()}.
                  </li>
                  <li>
                    Audience: {AUDIENCE[F.audience][0].toLowerCase()}. Harder-to-reach people take longer to find.
                  </li>
                  <li>
                    Prices exclude local taxes. The final price is confirmed after a short call about sampling and
                    locations.
                  </li>
                </ul>
              </details>
              {sent !== null ? (
                <p className="notice" role="status">
                  Request {sent} sent. We&apos;ll be in touch within 2 working days.
                </p>
              ) : (
                <div className="ctas tight">
                  <button type="button" className="btn gold" onClick={() => setRequesting(true)}>
                    Request this fieldwork
                  </button>
                  <button type="button" className="btn" onClick={downloadQuote}>
                    Download quote (Excel)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        {requesting && q && (
          <form className="card" onSubmit={submit} onChange={() => error && setError("")} noValidate>
            <h2>Request this fieldwork</h2>
            <p className="hint">
              We&apos;ll confirm sampling, locations and dates, then send a final quote. No payment is taken now.
            </p>
            <div className="grid2">
              <label>
                Your name
                <input name="name" maxLength={80} autoComplete="name" />
              </label>
              <label>
                Organisation
                <input name="organisation" maxLength={120} autoComplete="organization" />
              </label>
              <label>
                Email
                <input name="email" type="email" maxLength={160} autoComplete="email" />
              </label>
              <label>
                Phone (optional)
                <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
              </label>
            </div>
            <label>
              Preferred start date
              <input name="start" type="date" />
            </label>
            <label>
              Anything else we should know?
              <textarea
                name="notes"
                rows={3}
                maxLength={1200}
                placeholder="Regions, languages, sampling quotas, deadlines…"
              />
            </label>
            <div className="hp" aria-hidden="true">
              <label>
                Leave this empty
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <label className="inline">
              <input type="checkbox" name="consent" />
              You can contact me about this quote.
            </label>
            {error && (
              <p className="errs" role="alert">
                {error}
              </p>
            )}
            <div className="ctas tight">
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </button>
              <button className="btn ghost" type="button" onClick={() => setRequesting(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
        <p className="hint">
          Prefer to run it online? <Link href="/surveys/new">Build an online survey</Link>.
        </p>
      </aside>
    </div>
  );
}
