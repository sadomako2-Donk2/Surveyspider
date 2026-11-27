import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEAM } from "@/content/team";

describe("team profiles", () => {
  it("every profile has a name, role, bio and an existing photo", () => {
    for (const t of TEAM) {
      expect([t.id, t.name.length > 3, t.role.length > 3, t.bio.length > 40]).toEqual([t.id, true, true, true]);
      expect([t.id, existsSync(new URL(`../../public/team/${t.photo}`, import.meta.url))]).toEqual([t.id, true]);
    }
  });
});
