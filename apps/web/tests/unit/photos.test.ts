import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTOS } from "@/content/photos";

const dir = path.join(import.meta.dirname, "..", "..", "public", "photos");

describe("website photos", () => {
  it("every photo that has been added has a description for screen readers", () => {
    for (const [slot, p] of Object.entries(PHOTOS))
      if (existsSync(path.join(dir, p.file))) expect([slot, p.alt.trim().length > 10]).toEqual([slot, true]);
  });

  it("every image in public/photos belongs to a slot, so nothing is uploaded by mistake", () => {
    const files = new Set(Object.values(PHOTOS).map((p) => p.file));
    const images = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif|svg)$/i.test(f));
    expect(images.filter((f) => !files.has(f))).toEqual([]);
  });
});
