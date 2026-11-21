import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTOS, SLIDESHOW } from "@/content/photos";

const dir = path.join(import.meta.dirname, "..", "..", "public", "photos");

describe("website photos", () => {
  it("every photo that has been added has a description for screen readers", () => {
    for (const [slot, p] of Object.entries(PHOTOS))
      if (existsSync(path.join(dir, p.file))) expect([slot, p.alt.trim().length > 10]).toEqual([slot, true]);
  });

  it("every slot with a description has its file, so no broken images appear", () => {
    for (const [slot, p] of Object.entries(PHOTOS))
      if (p.alt.trim()) expect([slot, existsSync(path.join(dir, p.file))]).toEqual([slot, true]);
  });

  it("the slideshow starts with the home photo and only uses slots that have a photo", () => {
    expect(SLIDESHOW[0]).toBe("home");
    for (const k of SLIDESHOW) expect([k, PHOTOS[k].alt.trim().length > 10]).toEqual([k, true]);
  });

  it("every image in public/photos belongs to a slot, so nothing is uploaded by mistake", () => {
    const files = new Set(Object.values(PHOTOS).map((p) => p.file));
    const images = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif|svg)$/i.test(f));
    expect(images.filter((f) => !files.has(f))).toEqual([]);
  });
});
