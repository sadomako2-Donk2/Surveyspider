import { describe, expect, it } from "vitest";
import { csvCell, csvRow, formatDates, formatFee, parseDay, seatsText, slugify, toMinor } from "@/lib/academy";

describe("academy helpers", () => {
  it("formats fees in each currency", () => {
    expect(formatFee(120000, "GHS")).toBe("GH₵1,200");
    expect(formatFee(1250, "USD")).toBe("US$12.50");
    expect(formatFee(0, "EUR")).toBe("Free");
    expect(formatFee(9900, "GBP")).toBe("£99");
  });
  it("converts typed fees to minor units", () => {
    expect([toMinor("1200"), toMinor("12.5"), toMinor("1,200.00"), toMinor("")]).toEqual([120000, 1250, 120000, 0]);
    expect([toMinor("-5"), toMinor("1.234"), toMinor("abc")].every(Number.isNaN)).toBe(true);
  });
  it("parses calendar dates strictly", () => {
    expect(parseDay("2099-03-01")?.toISOString()).toBe("2099-03-01T00:00:00.000Z");
    expect(parseDay("")).toBeNull();
    expect(Number.isNaN(parseDay("2099-02-30")!.getTime())).toBe(true);
    expect(Number.isNaN(parseDay("1/3/2099")!.getTime())).toBe(true);
  });
  it("formats date ranges", () => {
    expect(formatDates("2099-02-10", "2099-02-11")).toBe("10 Feb 2099 – 11 Feb 2099");
    expect(formatDates("2099-02-10", "2099-02-10")).toBe("10 Feb 2099");
    expect(formatDates(null, null)).toBe("Date to be confirmed");
  });
  it("describes seats", () => {
    expect([seatsText(0, 5), seatsText(2, 1), seatsText(2, 2), seatsText(10, 3)]).toEqual([
      "Places available",
      "1 seat left",
      "Full",
      "7 seats left",
    ]);
  });
  it("makes URL slugs", () => {
    expect(slugify("Quantitative Data Analysis with SPSS, Stata or R")).toBe(
      "quantitative-data-analysis-with-spss-stata-or-r",
    );
    expect(slugify("M&E for Programmes")).toBe("m-and-e-for-programmes");
    expect(slugify("¡¿!")).toBe("course");
  });
  it("writes safe CSV", () => {
    expect(csvRow(["a", 'say "hi"', "x,y", "=SUM(A1)", "+233 20", null])).toBe(
      `a,"say ""hi""","x,y",'=SUM(A1),'+233 20,`,
    );
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });
});
