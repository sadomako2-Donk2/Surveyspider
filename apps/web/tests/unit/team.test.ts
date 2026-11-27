import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEAM } from "@/content/team";

describe("team profiles", () => {
  it("every profile has a name, role, bio and an existing photo", () => {
    for (const t of TEAM) {
      expect([t.id, t.name.length > 3, t.role.length > 3, t.bio.length > 40]).toEqual([t.id, true, true, true]);
      if (t.photo)
        expect([t.id, existsSync(new URL(`../../public/team/${t.photo}`, import.meta.url))]).toEqual([t.id, true]);
    }
  });
});

describe("initials", () => {
  it("uses the first letters of the first two names, ignoring titles after the comma", async () => {
    const { initials } = await import("@/content/team");
    expect(initials("Emmanuel Amoah, MBA, ACCA")).toBe("EA");
    expect(initials("Irene Chu, PhD")).toBe("IC");
  });
});

describe("leadership team", () => {
  it("lists the five leadership roles in order", async () => {
    const { LEADERSHIP } = await import("@/content/team");
    expect(LEADERSHIP.map((l) => l.abbr)).toEqual(["CEO", "BD", "FIN", "PHC", "OPS"]);
  });
});
