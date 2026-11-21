// Survey ⇄ Excel, matching Phase 1's workbook layout so files move between the two sites.
// The ExcelJS module is passed in, so browsers load it only when needed and tests can use it directly.
import type ExcelJSType from "exceljs";
import {
  DEFAULT_SCALE,
  PLATFORM_FEE,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPES,
  normaliseQuestion,
  scaleOf,
  type QuestionInput,
  type QuestionTypeCode,
} from "@/lib/surveys";

type ExcelJS = typeof ExcelJSType;
const NAVY = "FF10285A",
  GOLD = "FFB88A2C",
  PALE = "FFF5F6F9";

export interface ExportableSurvey {
  title: string;
  description: string;
  status: string;
  questions: QuestionInput[];
  target: number;
  minutes: number;
  reward: number; // US dollars
  screening: { minAge: number; maxAge: number; countries: string[]; occupations: string[] };
  attentionCheck: boolean;
}

export function optionText(q: QuestionInput): string {
  if (q.type === "RATING") {
    const s = scaleOf(q.scale);
    return `${s.min}–${s.max}${s.minLabel || s.maxLabel ? ` · ${s.minLabel} … ${s.maxLabel}` : ""}`;
  }
  return q.options.join(" | ");
}

const colLetter = (n: number): string =>
  n <= 26
    ? String.fromCharCode(64 + n)
    : colLetter(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + ((n - 1) % 26));

export function surveyWorkbook(Excel: ExcelJS, s: ExportableSurvey): ExcelJSType.Workbook {
  const wb = new Excel.Workbook();
  wb.creator = "Afrimetrica";
  wb.created = new Date();
  const bold = (row: ExcelJSType.Row) => (row.getCell(1).font = { bold: true, color: { argb: NAVY } });

  const o = wb.addWorksheet("Survey", { properties: { tabColor: { argb: NAVY } }, views: [{ showGridLines: false }] });
  o.getCell("A1").value = s.title || "Untitled survey";
  o.getCell("A1").font = { bold: true, size: 16, color: { argb: NAVY } };
  o.getCell("A2").value = `Afrimetrica Surveys · exported ${new Date().toISOString().slice(0, 10)}`;
  o.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF56627A" } };
  const info: [string, ExcelJSType.CellValue][] = [
    ["Description", s.description],
    ["Status", s.status.toLowerCase()],
    ["Questions", s.questions.length],
    ["Participants wanted", s.target],
    ["Minutes to complete", s.minutes],
    ["Reward per participant (USD)", s.reward],
    [
      "Hourly pay (USD)",
      { formula: "B9/(B8/60)", result: s.minutes ? s.reward / (s.minutes / 60) : 0 } as ExcelJSType.CellFormulaValue,
    ],
    ["Platform fee", PLATFORM_FEE],
    [
      "Estimated total cost (USD)",
      { formula: "B7*B9*(1+B11)", result: s.target * s.reward * (1 + PLATFORM_FEE) } as ExcelJSType.CellFormulaValue,
    ],
    ["Ages", `${s.screening.minAge}–${s.screening.maxAge}`],
    ["Countries", s.screening.countries.join(", ") || "All"],
    ["Occupations", s.screening.occupations.join(", ") || "All"],
    ["Attention check", s.attentionCheck ? "Yes" : "No"],
  ];
  info.forEach(([k, v], i) => {
    const row = o.getRow(4 + i);
    row.values = [k, v];
    bold(row);
  });
  o.getCell("B9").numFmt = o.getCell("B10").numFmt = o.getCell("B12").numFmt = '"$"#,##0.00';
  o.getCell("B11").numFmt = "0%";
  o.getColumn(1).width = 30;
  o.getColumn(2).width = 80;
  o.getRow(19).values = ["How to use this workbook"];
  o.getRow(19).font = { bold: true, color: { argb: GOLD } };
  o.getRow(20).values = [
    "Questions",
    "Every question, its type and answer options. Edit it and upload it on the Upload page to create a new survey.",
  ];
  o.getRow(21).values = [
    "Answer sheet",
    "Collect answers offline or on paper. Dropdowns limit each cell to valid answers.",
  ];

  const qs = wb.addWorksheet("Questions", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  qs.addRow(["No.", "Question", "Type", "Answer options or scale", "Required"]);
  qs.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  });
  s.questions.forEach((q, i) =>
    qs.addRow([i + 1, q.text, QUESTION_TYPE_LABEL[q.type], optionText(q), q.required ? "Yes" : "No"]),
  );
  [6, 60, 18, 60, 10].forEach((w, i) => (qs.getColumn(i + 1).width = w));
  for (let r = 2; r <= s.questions.length + 1; r++)
    qs.getCell(`C${r}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`"${Object.values(QUESTION_TYPE_LABEL).join(",")}"`],
    };

  const lists = wb.addWorksheet("Lists", { state: "hidden" });
  const ans = wb.addWorksheet("Answer sheet", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
  ans.addRow(["Respondent", ...s.questions.map((q, i) => `Q${i + 1}. ${q.text}`)]);
  ans.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { wrapText: true, vertical: "top" };
  });
  let lc = 0;
  s.questions.forEach((q, i) => {
    const col = colLetter(i + 2);
    let dv: ExcelJSType.DataValidation | null = null;
    if (q.type === "SINGLE" || q.type === "LIKERT") {
      const L = colLetter(++lc);
      lists.getCell(`${L}1`).value = `Q${i + 1}`;
      q.options.forEach((opt, k) => (lists.getCell(`${L}${k + 2}`).value = opt));
      dv = {
        type: "list",
        allowBlank: true,
        formulae: [`Lists!$${L}$2:$${L}$${q.options.length + 1}`],
        showErrorMessage: true,
        errorTitle: "Not an option",
        error: "Choose one of the answers in the list.",
      };
    } else if (q.type === "RATING") {
      const sc = scaleOf(q.scale);
      dv = {
        type: "whole",
        operator: "between",
        allowBlank: true,
        formulae: [sc.min, sc.max],
        showErrorMessage: true,
        errorTitle: "Out of range",
        error: `Enter a whole number from ${sc.min} to ${sc.max}.`,
      };
    } else if (q.type === "NUMBER")
      dv = {
        type: "decimal",
        operator: "greaterThanOrEqual",
        allowBlank: true,
        formulae: [-1e12],
        showErrorMessage: true,
        error: "Enter a number.",
      };
    if (dv) for (let r = 2; r <= 201; r++) ans.getCell(`${col}${r}`).dataValidation = dv;
    ans.getColumn(i + 2).width = Math.min(40, Math.max(18, q.text.length * 0.5));
  });
  for (let r = 2; r <= 201; r++) {
    ans.getCell(`A${r}`).value = r - 1;
    ans.getCell(`A${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE } };
  }
  ans.getColumn(1).width = 12;
  ans.getRow(1).height = 60;
  return wb;
}

const TYPE_BY_LABEL = Object.fromEntries(
  QUESTION_TYPES.map((t) => [QUESTION_TYPE_LABEL[t].toLowerCase(), t]),
) as Record<string, QuestionTypeCode>;

function cellText(c: ExcelJSType.Cell | undefined): string {
  const v = c?.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v && v.result != null) return String(v.result);
    if ("text" in v) return String(v.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return "";
  }
  return String(v);
}

export type ExcelRead = { exact: true; title: string; questions: QuestionInput[] } | { exact: false; lines: string[] };

/**
 * Reads an .xlsx. A file with a "Questions" sheet (like the ones Afrimetrica exports) comes back exactly;
 * anything else is read cell by cell and passed to the questionnaire parser.
 */
export async function readSurveyWorkbook(Excel: ExcelJS, data: ArrayBuffer): Promise<ExcelRead> {
  const wb = new Excel.Workbook();
  await wb.xlsx.load(data);
  const qs = wb.worksheets.find((w) => /^questions$/i.test(w.name.trim()));
  if (qs) {
    let hr = 0,
      cQ = 0,
      cT = 0,
      cO = 0,
      cR = 0;
    qs.eachRow((row, n) => {
      if (hr) return;
      row.eachCell((c, k) => {
        const t = cellText(c).toLowerCase().trim();
        if (t === "question") cQ = k;
        if (t === "type") cT = k;
        if (/answer options|options/.test(t)) cO = k;
        if (t === "required") cR = k;
      });
      if (cQ) hr = n;
    });
    if (cQ) {
      const out: QuestionInput[] = [];
      qs.eachRow((row, n) => {
        if (n <= hr) return;
        const text = cellText(row.getCell(cQ)).trim();
        if (!text) return;
        const type =
          TYPE_BY_LABEL[
            cellText(cT ? row.getCell(cT) : undefined)
              .trim()
              .toLowerCase()
          ] ?? "TEXT";
        const opt = cO ? cellText(row.getCell(cO)).trim() : "";
        const required = !cR || !/^no$/i.test(cellText(row.getCell(cR)).trim());
        let scale = null,
          options: string[] = [];
        if (type === "RATING") {
          const m = opt.match(/^(\d+)\s*[–-]\s*(\d+)(?:\s*·\s*(.*?)\s*…\s*(.*))?$/);
          scale = m ? { min: +m[1]!, max: +m[2]!, minLabel: m[3] ?? "", maxLabel: m[4] ?? "" } : { ...DEFAULT_SCALE };
        } else if (type === "SINGLE" || type === "MULTI" || type === "LIKERT")
          options = opt
            .split(/\s*\|\s*|\n/)
            .map((x) => x.trim())
            .filter(Boolean);
        out.push(normaliseQuestion({ type, text, options, scale, required }));
      });
      const survey = wb.worksheets.find((w) => /^survey$/i.test(w.name.trim()));
      return { exact: true, title: survey ? cellText(survey.getCell("A1")).trim() : "", questions: out.slice(0, 300) };
    }
  }
  const lines: string[] = [];
  wb.worksheets.forEach((w) => {
    if (w.state === "hidden") return;
    w.eachRow((row) =>
      row.eachCell((c) => {
        const t = cellText(c).trim();
        if (t) lines.push(t);
      }),
    );
  });
  return { exact: false, lines };
}
