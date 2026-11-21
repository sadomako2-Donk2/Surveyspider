"use client";

import { insights, responseQuality, scoreOf, summarise, type AQ, type ARow } from "@/lib/analysis";
import { QUESTION_TYPE_LABEL } from "@/lib/surveys";

const NAVY = "FF10285A";
const fileSafe = (s: string) =>
  (s || "survey")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "survey";

/** Builds the analysis workbook in the browser: Summary, Results and Responses (participants as P-codes). */
export async function downloadAnalysis(
  title: string,
  questions: AQ[],
  rows: ARow[],
  filterNote: string,
  totals: { all: number; flagged: number },
) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Afrimetrica";
  const head = (row: { eachCell: (f: (c: { font: unknown; fill: unknown }) => void) => void }) =>
    row.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    });

  const sum = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  sum.getCell("A1").value = title;
  sum.getCell("A1").font = { bold: true, size: 16, color: { argb: NAVY } };
  sum.getCell("A2").value =
    `Afrimetrica Surveys analysis · ${filterNote} · exported ${new Date().toISOString().slice(0, 10)}`;
  sum.getCell("A2").font = { italic: true, size: 9 };
  sum.addRow([]);
  sum.addRow(["Responses analysed", rows.length]);
  sum.addRow(["Waiting for review (not included unless chosen)", totals.flagged]);
  sum.addRow([]);
  head(sum.addRow(["Insight", "Finding", "Detail"]));
  for (const i of insights(questions, rows, { total: totals.all, flagged: totals.flagged }))
    sum.addRow([i.label, i.title, i.text]);
  sum.getColumn(1).width = 34;
  sum.getColumn(2).width = 50;
  sum.getColumn(3).width = 90;

  const res = wb.addWorksheet("Results");
  head(res.addRow(["No.", "Question", "Type", "Answer or statistic", "Count", "Percent"]));
  questions.forEach((q, i) => {
    const s = summarise(q, rows);
    if (s.kind === "choice")
      for (const c of s.counts)
        res.addRow([i + 1, q.text, QUESTION_TYPE_LABEL[q.type], c.option, c.count, c.pct / 100]);
    else if (s.kind === "numeric" && s.stats)
      (
        [
          ["Mean", s.stats.mean],
          ["Median", s.stats.median],
          ["Standard deviation", s.stats.sd],
          ["Lowest", s.stats.min],
          ["Highest", s.stats.max],
          ["95% CI low", s.stats.lo],
          ["95% CI high", s.stats.hi],
          ...(s.nps ? [["Net Promoter Score", s.nps.nps] as [string, number]] : []),
        ] as [string, number][]
      ).forEach(([k, v]) =>
        res.addRow([
          i + 1,
          q.text,
          QUESTION_TYPE_LABEL[q.type],
          k,
          Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null,
          null,
        ]),
      );
    else res.addRow([i + 1, q.text, QUESTION_TYPE_LABEL[q.type], `${s.n} written answers (see Responses)`, s.n, null]);
  });
  res.getColumn(6).numFmt = "0%";
  [6, 60, 16, 40, 10, 10].forEach((w, i) => (res.getColumn(i + 1).width = w));

  const rs = wb.addWorksheet("Responses", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
  const cols = [
    "Participant",
    "Version",
    "Submitted",
    "Status",
    "Quality score",
    "Minutes",
    "Age",
    "Gender",
    "Country",
    "Occupation",
  ];
  questions.forEach((q, i) => {
    cols.push(`Q${i + 1}. ${q.text}`);
    if (q.type === "LIKERT") cols.push(`Q${i + 1} score (1–${q.options.length})`);
  });
  head(rs.addRow(cols));
  for (const r of rows) {
    const d = r.demographics ?? {};
    const vals: unknown[] = [
      r.code,
      r.version,
      new Date(r.submittedAt),
      r.status === "APPROVED" ? "Approved" : "Waiting for review",
      responseQuality(questions, r).score,
      r.durationSeconds == null ? null : Math.round(r.durationSeconds / 6) / 10,
      d.age ?? null,
      d.gender ?? "",
      d.country ?? "",
      d.occupation ?? "",
    ];
    for (const q of questions) {
      const v = r.answers[q.id];
      vals.push(Array.isArray(v) ? v.join("; ") : (v ?? ""));
      if (q.type === "LIKERT") vals.push(scoreOf(q, v));
    }
    rs.addRow(vals);
  }
  rs.getColumn(3).numFmt = "yyyy-mm-dd hh:mm";

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileSafe(title)}-analysis.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
