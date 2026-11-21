import { describe, expect, it } from "vitest";
import { NAV, SITE, legalLine } from "@/lib/site";

describe("site constants", () => {
  it("keeps the nine public sections in the agreed order", () => {
    expect(NAV.map((n) => n.label)).toEqual([
      "Home",
      "About",
      "Training",
      "Surveys",
      "Analytics",
      "Consultancy",
      "Resources",
      "Contact",
      "My Account",
    ]);
  });
  it("names the legal operator", () => {
    expect(legalLine()).toBe("Afrimetrica is operated by Regelco International Ltd, a company registered in Ghana.");
    expect(SITE.tagline).toBe("Advancing Research, Measurement and Evidence");
  });
});
