import { describe, expect, it } from "vitest";
import { NAV, SITE } from "@/lib/site";

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
  it("doesn't describe Afrimetrica as a centre", () => {
    expect(`${SITE.longName} ${SITE.tagline}`).not.toMatch(/centre/i);
  });
});
