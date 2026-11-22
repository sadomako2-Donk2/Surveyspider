// Section content shared with the live site: training catalogue, analytics, consultancy and About.
// sections.json is generated from the live site by scripts/phase1/extract-content.mjs, so both sites say
// the same thing. Edit the live site first, then re-run that script, until the live site is retired.
import data from "./sections.json";

export interface Course {
  id: string;
  cat: string;
  title: string;
  days: number;
  level: string;
  summary: string;
  objectives: string[];
  audience: string;
  outline: [string, string][];
}
export interface AnService {
  id: string;
  name: string;
  summary: string;
  questions: string[];
  deliverables: string[];
  methods: string;
  courses: string[];
}
export interface AnSector {
  id: string;
  name: string;
  summary: string;
  questions: string[];
  services: string[];
}
export interface CoService {
  id: string;
  name: string;
  summary: string;
  when: string[];
  deliverables: string[];
  analytics: string[];
  courses: string[];
}
export interface CoSector {
  id: string;
  name: string;
  summary: string;
  assignments: string[];
  services: string[];
}

export const SUBJECTS = data.subjects as Record<string, string>;
export const SUBJECT_INTRO = data.subjectIntro as Record<string, string>;
export const GROUPS = data.groups as { id: string; name: string; subjects: string[] }[];
export const FORMATS = data.formats as string[];
export const VENUES = data.venues as { country: string; cities: string[] }[];
export const COURSES = data.courses as unknown as Course[];
export const NEW_COURSES = data.newCourses as string[];
export const AN_SERVICES = data.analytics.services as AnService[];
export const AN_SECTORS = data.analytics.sectors as AnSector[];
export const AN_TOOLS = data.analytics.tools as { name: string; use: string }[];
export const CO_SERVICES = data.consultancy.services as CoService[];
export const CO_SECTORS = data.consultancy.sectors as CoSector[];
export const ABOUT = {
  ...data.about,
  // The live site uses #section links; the new site has real addresses.
  units: data.about.units.map((u) => ({ ...u, href: u.href.replace(/^#/, "/") })),
};

export const SECTOR_GROUP = "sector";
export const slug = (t: string) =>
  t
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const subjectName = (k: string) => SUBJECTS[k] ?? k;
export const group = (id: string) => GROUPS.find((g) => g.id === id);
export const groupsOfSubject = (k: string) => GROUPS.filter((g) => g.subjects.includes(k));
export const coursesInSubject = (k: string) => COURSES.filter((c) => c.cat === k);
export const coursesInGroup = (id: string) => COURSES.filter((c) => group(id)?.subjects.includes(c.cat));
export const course = (id: string) => COURSES.find((c) => c.id === id);
export const country = (s: string) => VENUES.find((v) => slug(v.country) === s);
export const VENUE_CITIES = VENUES.flatMap((v) => v.cities.map((c) => `${c}, ${v.country}`));
export const anService = (id: string) => AN_SERVICES.find((x) => x.id === id);
export const anSector = (id: string) => AN_SECTORS.find((x) => x.id === id);
export const coService = (id: string) => CO_SERVICES.find((x) => x.id === id);
export const coSector = (id: string) => CO_SECTORS.find((x) => x.id === id);
/** Lower-cases the first letter for use mid-sentence, leaving abbreviations such as "NGOs" or "AI" alone. */
export const lcFirst = (t: string) => (/^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
