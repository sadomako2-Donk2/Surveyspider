"use client";

import { useState } from "react";
import type { ExportableSurvey } from "@/lib/import/excel";

const fileSafe = (s: string) =>
  (s || "survey")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "survey";

/** Builds the survey workbook in the browser and downloads it. */
export function DownloadExcel({ survey }: { survey: () => ExportableSurvey }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="btn ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const [{ default: ExcelJS }, { surveyWorkbook }] = await Promise.all([
              import("exceljs"),
              import("@/lib/import/excel"),
            ]);
            const s = survey();
            const buf = await surveyWorkbook(ExcelJS, s).xlsx.writeBuffer();
            const url = URL.createObjectURL(
              new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `${fileSafe(s.title)}-survey.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          } catch {
            setError("The Excel file couldn't be created.");
          }
          setBusy(false);
        }}
      >
        {busy ? "Building…" : "Download Excel"}
      </button>
      {error && (
        <span className="hint" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
