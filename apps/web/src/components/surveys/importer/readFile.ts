"use client";

// Reads a questionnaire file entirely in the browser. Nothing is uploaded.
import { htmlToLines, parseQuestionnaire, type ParsedQuestionnaire } from "@/lib/import/parse";
import { readSurveyWorkbook } from "@/lib/import/excel";

export interface ReadResult extends ParsedQuestionnaire {
  method: "excel" | "auto";
  file: string;
}

export class ReadError extends Error {}

const MAX_BYTES = 20 * 1024 * 1024;

export async function readQuestionnaireFile(file: File): Promise<ReadResult> {
  const name = file.name || "your file";
  const base = name.replace(/\.[^.]+$/, "");
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (file.size > MAX_BYTES)
    throw new ReadError("That file is over 20 MB. Upload a smaller file or paste the questions instead.");
  if (ext === "xls")
    throw new ReadError(
      "Older .xls files can't be read. In Excel, choose File › Save As › Excel Workbook (.xlsx), then upload that.",
    );
  if (ext === "doc")
    throw new ReadError(
      "Older .doc files can't be read. In Word, choose File › Save As › Word Document (.docx), then upload that.",
    );

  let lines: string[];
  try {
    if (ext === "docx") {
      const mammoth = (await import("mammoth")).default;
      const out = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      lines = htmlToLines(out.value);
    } else if (ext === "pdf" || file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      lines = [];
      for (let p = 1; p <= Math.min(pdf.numPages, 60); p++) {
        const tc = await (await pdf.getPage(p)).getTextContent();
        let line = "";
        for (const it of tc.items) {
          if (!("str" in it)) continue;
          line += it.str;
          if (it.hasEOL) {
            lines.push(line);
            line = "";
          }
        }
        if (line) lines.push(line);
      }
      if (lines.join("").replace(/\s/g, "").length < 20)
        throw new ReadError(
          "This PDF looks like a scanned image, so it has no text to read. Upload the original Word file or paste the questions instead.",
        );
    } else if (ext === "xlsx") {
      const ExcelJS = (await import("exceljs")).default;
      const x = await readSurveyWorkbook(ExcelJS, await file.arrayBuffer());
      if (x.exact)
        return { method: "excel", file: name, title: x.title || base, description: "", questions: x.questions };
      lines = x.lines;
    } else if (["txt", "md", "text", "csv"].includes(ext) || file.type.startsWith("text/")) {
      lines = (await file.text()).split(/\r?\n/);
    } else throw new ReadError("Upload a Word (.docx), PDF, Excel (.xlsx) or text (.txt) file.");
  } catch (e) {
    if (e instanceof ReadError) throw e;
    console.error("Couldn't read file:", e);
    throw new ReadError(
      "This file couldn't be read. It may be damaged or password-protected. Try saving it again, or paste the questions instead.",
    );
  }
  return { method: "auto", file: name, ...parseQuestionnaire(lines, base) };
}

export const readPastedText = (text: string): ReadResult => ({
  method: "auto",
  file: "Pasted text",
  ...parseQuestionnaire(text.split(/\r?\n/), "Pasted questionnaire"),
});
