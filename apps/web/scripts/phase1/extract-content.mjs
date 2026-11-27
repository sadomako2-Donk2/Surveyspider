// Copies the live site's section content (training catalogue, analytics, consultancy, about, legal
// wording) into src/content/sections.json, so the new site shows exactly the same text.
// Run from the repository root:  git show origin/main:public/index.html > /tmp/live.html
//                                node apps/web/scripts/phase1/extract-content.mjs /tmp/live.html
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const html = readFileSync(process.argv[2], "utf8");
const grab = (start, end) => {
  const a = html.indexOf(start),
    b = html.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Couldn't find ${start}`);
  return html.slice(a, b);
};
const code = [
  grab("  const SUBJECTS = {", "  const catName ="),
  grab("  const AN_SERVICES = [", "  const anService ="),
  grab("  const CO_SERVICES = [", "  const coService ="),
  grab("  const AB_MISSION =", "  const abValues ="),
  grab("  const NEW_IDS =", "  const SECTOR_GROUP ="),
]
  .join("\n")
  .replace(/\bconst /g, "var ")
  .replace(/const VENUE_CITIES[^\n]*\n/, "");
const ctx = {};
vm.runInNewContext(code.replace(/var CAT_FORMATS/, "var CAT_FORMATS"), ctx);
const out = {
  subjects: ctx.SUBJECTS,
  subjectIntro: ctx.SUBJECT_INTRO,
  groups: ctx.GROUPS.map(([id, name, subjects]) => ({ id, name, subjects })),
  formats: ctx.CAT_FORMATS,
  venues: ctx.VENUES.map(([country, cities, region]) => ({
    country,
    cities,
    region: region === "intl" ? "International" : "Africa",
  })),
  courses: ctx.CATALOGUE,
  newCourses: ctx.NEW_IDS,
  analytics: {
    services: ctx.AN_SERVICES,
    sectors: ctx.AN_SECTORS,
    tools: ctx.AN_TOOLS.map(([name, use]) => ({ name, use })),
  },
  consultancy: { services: ctx.CO_SERVICES, sectors: ctx.CO_SECTORS },
  about: {
    mission: ctx.AB_MISSION,
    vision: ctx.AB_VISION,
    values: ctx.AB_VALUES.map(([title, text]) => ({ title, text })),
    units: ctx.AB_UNITS.map(([role, name, href]) => ({ role, name, href })),
  },
};
const file = path.join(import.meta.dirname, "../../src/content/sections.json");
writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(
  `Wrote ${file}: ${out.courses.length} courses, ${Object.keys(out.subjects).length} subjects, ${out.groups.length} areas, ${out.venues.length} countries`,
);
