import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { readSurveyWorkbook, surveyWorkbook } from "@/lib/import/excel";
import { SURVEY_TEMPLATES } from "@/lib/surveys";

const toArrayBuffer = (b: ArrayBuffer | Buffer): ArrayBuffer =>
  b instanceof ArrayBuffer ? b : (new Uint8Array(b).buffer as ArrayBuffer);

describe("Excel", () => {
  it("round-trips every template exactly", async () => {
    for (const t of SURVEY_TEMPLATES) {
      const wb = surveyWorkbook(ExcelJS, {
        title: t.title,
        description: t.description,
        status: "DRAFT",
        questions: t.questions,
        target: t.target,
        minutes: t.minutes,
        reward: t.reward,
        screening: { minAge: 18, maxAge: 120, countries: [], occupations: t.occupations },
        attentionCheck: true,
      });
      const read = await readSurveyWorkbook(ExcelJS, toArrayBuffer(await wb.xlsx.writeBuffer()));
      expect(read.exact).toBe(true);
      if (read.exact) {
        expect(read.title).toBe(t.title);
        expect(read.questions).toEqual(t.questions);
      }
    }
  });

  it("has the Phase 1 sheets, with live cost formulas and answer dropdowns", async () => {
    const t = SURVEY_TEMPLATES.find((x) => x.key === "cx")!;
    const wb = surveyWorkbook(ExcelJS, {
      ...t,
      status: "LIVE",
      screening: { minAge: 18, maxAge: 99, countries: ["Ghana"], occupations: [] },
      attentionCheck: false,
    });
    expect(wb.worksheets.map((w) => [w.name, w.state])).toEqual([
      ["Survey", "visible"],
      ["Questions", "visible"],
      ["Lists", "hidden"],
      ["Answer sheet", "visible"],
    ]);
    const survey = wb.getWorksheet("Survey")!;
    expect(survey.getCell("B12").value).toMatchObject({ formula: "B7*B9*(1+B11)", result: 150 * 1 * 1.25 });
    expect(wb.getWorksheet("Answer sheet")!.getCell("B2").dataValidation).toMatchObject({ type: "list" });
  });

  it("reads other spreadsheets cell by cell for the questionnaire parser", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet1");
    ws.addRow(["1. How old are you?"]);
    ws.addRow(["2. Which region?", "Greater Accra"]);
    const read = await readSurveyWorkbook(ExcelJS, toArrayBuffer(await wb.xlsx.writeBuffer()));
    expect(read).toEqual({ exact: false, lines: ["1. How old are you?", "2. Which region?", "Greater Accra"] });
  });
});
