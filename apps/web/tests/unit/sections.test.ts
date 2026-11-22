import { describe, expect, it } from "vitest";
import { SECTION_MENUS, navDrop } from "@/content/menus";
import {
  AN_SECTORS,
  AN_SERVICES,
  COURSES,
  CO_SECTORS,
  CO_SERVICES,
  GROUPS,
  NEW_COURSES,
  SUBJECTS,
  anService,
  coService,
  course,
  lcFirst,
} from "@/content/sections";

describe("section content (copied from the live site)", () => {
  it("has the full catalogue, and every course, subject and area fits together", () => {
    expect(COURSES.length).toBeGreaterThanOrEqual(99);
    expect(new Set(COURSES.map((c) => c.id)).size).toBe(COURSES.length);
    for (const c of COURSES) {
      expect([c.id, !!SUBJECTS[c.cat]]).toEqual([c.id, true]);
      expect([c.id, c.outline.length]).toEqual([c.id, c.days]); // one outline entry per day
    }
    for (const g of GROUPS) for (const k of g.subjects) expect([g.id, k, !!SUBJECTS[k]]).toEqual([g.id, k, true]);
    for (const k of Object.keys(SUBJECTS)) expect([k, COURSES.some((c) => c.cat === k)]).toEqual([k, true]);
  });

  it("only links to things that exist", () => {
    for (const id of NEW_COURSES) expect([id, !!course(id)]).toEqual([id, true]);
    for (const s of [...AN_SERVICES, ...CO_SERVICES])
      for (const id of s.courses) expect([s.id, id, !!course(id)]).toEqual([s.id, id, true]);
    for (const s of CO_SERVICES)
      for (const id of s.analytics) expect([s.id, id, !!anService(id)]).toEqual([s.id, id, true]);
    for (const s of AN_SECTORS)
      for (const id of s.services) expect([s.id, id, !!anService(id)]).toEqual([s.id, id, true]);
    for (const s of CO_SECTORS)
      for (const id of s.services) expect([s.id, id, !!coService(id)]).toEqual([s.id, id, true]);
  });

  it("never claims accreditation", () => {
    const text = JSON.stringify({ COURSES, AN_SERVICES, CO_SERVICES });
    expect(text).not.toMatch(/accredited (course|programme|training)|CPD certified|PMI registered/i);
  });

  it("keeps abbreviations capitalised mid-sentence", () => {
    expect(lcFirst("NGOs and development partners")).toBe("NGOs and development partners");
    expect(lcFirst("Health")).toBe("health");
  });
});

describe("menus", () => {
  it("every section menu and dropdown has links", () => {
    for (const [section, m] of Object.entries(SECTION_MENUS)) {
      expect([section, m.items.length > 2]).toEqual([section, true]);
      for (const i of m.items)
        expect([section, i.label, !!(i.href || i.panel?.length)]).toEqual([section, i.label, true]);
      expect(navDrop(section)?.flatMap((g) => g.links).length).toBeGreaterThan(2);
    }
  });
});
