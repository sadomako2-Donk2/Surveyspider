// Each section's own menu bar, and the dropdown shown when hovering over it in the main menu.
import {
  AN_SECTORS,
  AN_SERVICES,
  CO_SECTORS,
  CO_SERVICES,
  GROUPS,
  SECTOR_GROUP,
  VENUES,
  coursesInSubject,
  group,
  slug,
  subjectName,
} from "./sections";

export interface MenuLink {
  href: string;
  label: string;
  note?: string;
}
export interface MenuItem {
  label: string;
  href?: string; // a plain link…
  panel?: MenuLink[]; // …or a ▾ button that opens a panel of links
  style?: "new" | "cta";
  /** Paths that count as "inside" this item, for highlighting. */
  match?: (path: string) => boolean;
}
export interface SectionMenu {
  label: string;
  items: MenuItem[];
}

const under = (prefix: string) => (p: string) => p === prefix || p.startsWith(`${prefix}/`);
const sectorSubjects = group(SECTOR_GROUP)?.subjects ?? [];

export const SECTION_MENUS: Record<string, SectionMenu> = {
  "/about": {
    label: "About Afrimetrica",
    items: [
      { label: "Overview", href: "/about" },
      { label: "Our mission", href: "/about/mission" },
      { label: "Our vision", href: "/about/vision" },
      { label: "Our team", href: "/about/team" },
      { label: "How we're organised", href: "/about/organisation" },
      { label: "About our certificates", href: "/about/certificates" },
    ],
  },
  "/training": {
    label: "Afrimetrica Academy",
    items: [
      { label: "New", href: "/training/new", style: "new" },
      { label: "Course finder", href: "/training/finder" },
      {
        label: "Courses",
        panel: GROUPS.map((g) => ({ href: `/training/area/${g.id}`, label: g.name })),
        match: (p) =>
          p.startsWith("/training/area/") ||
          (p.startsWith("/training/subject/") && !sectorSubjects.includes(p.split("/")[3] ?? "")),
      },
      {
        label: "Training venues",
        panel: [
          ...VENUES.map((v) => ({
            href: `/training/venue/${slug(v.country)}`,
            label: v.country,
            note: v.cities.join(", "),
          })),
          { href: "/training/venues", label: "All venues", note: `${VENUES.length} countries` },
        ],
        match: (p) => under("/training/venues")(p) || p.startsWith("/training/venue/"),
      },
      { label: "Certificates", href: "/training/certificates" },
      {
        label: "Training sectors",
        panel: sectorSubjects.map((k) => ({
          href: `/training/subject/${k}`,
          label: subjectName(k),
          note: `${coursesInSubject(k).length} course${coursesInSubject(k).length === 1 ? "" : "s"}`,
        })),
        match: (p) =>
          under("/training/sectors")(p) ||
          (p.startsWith("/training/subject/") && sectorSubjects.includes(p.split("/")[3] ?? "")),
      },
    ],
  },
  "/analytics": {
    label: "Afrimetrica Analytics",
    items: [
      { label: "Overview", href: "/analytics" },
      {
        label: "Services",
        panel: AN_SERVICES.map((x) => ({ href: `/analytics/service/${x.id}`, label: x.name, note: x.summary })),
        match: (p) => p.startsWith("/analytics/service/"),
      },
      {
        label: "Sectors",
        panel: AN_SECTORS.map((x) => ({ href: `/analytics/sector/${x.id}`, label: x.name, note: x.summary })),
        match: (p) => p.startsWith("/analytics/sector/"),
      },
      { label: "Tools we use", href: "/analytics/tools" },
      { label: "How we work", href: "/analytics/how-we-work" },
      { label: "Data security", href: "/analytics/data-security" },
      { label: "Request analysis", href: "/analytics/request", style: "cta" },
    ],
  },
  "/consultancy": {
    label: "Afrimetrica Consulting",
    items: [
      { label: "Overview", href: "/consultancy" },
      {
        label: "Services",
        panel: CO_SERVICES.map((x) => ({ href: `/consultancy/service/${x.id}`, label: x.name, note: x.summary })),
        match: (p) => p.startsWith("/consultancy/service/"),
      },
      {
        label: "Sectors",
        panel: CO_SECTORS.map((x) => ({ href: `/consultancy/sector/${x.id}`, label: x.name, note: x.summary })),
        match: (p) => p.startsWith("/consultancy/sector/"),
      },
      { label: "Our approach", href: "/consultancy/approach" },
      { label: "Fieldwork quote", href: "/surveys/paper" },
      { label: "Work with us", href: "/consultancy/work-with-us" },
      { label: "Request a proposal", href: "/consultancy/request", style: "cta" },
    ],
  },
  "/resources": {
    label: "Knowledge Hub",
    items: [
      { label: "Overview", href: "/resources" },
      {
        label: "Articles and guides",
        href: "/resources/articles",
        match: (p) => under("/resources/articles")(p) || p.startsWith("/resources/guides/"),
      },
      { label: "Case studies", href: "/resources/case-studies" },
      { label: "Testimonials", href: "/resources/testimonials" },
      { label: "Press releases", href: "/resources/press" },
      { label: "Videos", href: "/resources/videos" },
      { label: "Catalogues and brochures", href: "/resources/catalogues", match: under("/resources/catalogues") },
    ],
  },
  "/contact": {
    label: "Contact",
    items: [
      { label: "Contact us", href: "/contact" },
      { label: "Hotel reservation", href: "/contact/hotel" },
      { label: "Careers", href: "/contact/careers" },
      { label: "Find training", href: "/training/finder" },
      { label: "Mailing list", href: "/contact/mailing-list" },
    ],
  },
};

/** Groups of links shown when hovering over a main menu item. */
export function navDrop(section: string): { title: string; links: MenuLink[] }[] | null {
  const m = SECTION_MENUS[section];
  if (section === "/training")
    return [
      {
        title: "Explore",
        links: [
          { href: "/training", label: "Training home" },
          { href: "/training/new", label: "New courses" },
          { href: "/training/finder", label: "Course finder" },
          { href: "/training/venues", label: "Training venues" },
          { href: "/training/sectors", label: "Training sectors" },
          { href: "/training/certificates", label: "Certificates" },
        ],
      },
      {
        title: "Subject areas",
        links: GROUPS.filter((g) => g.id !== SECTOR_GROUP).map((g) => ({
          href: `/training/area/${g.id}`,
          label: g.name,
        })),
      },
    ];
  if (section === "/analytics" || section === "/consultancy") {
    const svc = section === "/analytics" ? AN_SERVICES : CO_SERVICES,
      sec = section === "/analytics" ? AN_SECTORS : CO_SECTORS;
    return [
      { title: "Services", links: svc.map((x) => ({ href: `${section}/service/${x.id}`, label: x.name })) },
      { title: "Sectors", links: sec.map((x) => ({ href: `${section}/sector/${x.id}`, label: x.name })) },
      { title: "More", links: m!.items.filter((i) => i.href).map((i) => ({ href: i.href!, label: i.label })) },
    ];
  }
  if (section === "/surveys")
    return [
      {
        title: "Afrimetrica Surveys",
        links: [
          { href: "/surveys", label: "Overview" },
          { href: "/surveys/new", label: "Create" },
          { href: "/surveys/import", label: "Upload" },
          { href: "/surveys/paper", label: "Paper surveys" },
          { href: "/surveys/mine", label: "My surveys" },
          { href: "/surveys/take", label: "Take surveys" },
        ],
      },
    ];
  if (section === "/account")
    return [
      {
        title: "My Account",
        links: [
          { href: "/account", label: "Overview" },
          { href: "/account#courses", label: "My courses" },
          { href: "/account#enquiries", label: "My enquiries" },
          { href: "/surveys/mine", label: "My surveys" },
        ],
      },
    ];
  if (!m) return null;
  return [{ title: m.label, links: m.items.filter((i) => i.href).map((i) => ({ href: i.href!, label: i.label })) }];
}
