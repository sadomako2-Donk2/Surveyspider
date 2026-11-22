import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/pages";
import {
  AN_SECTORS,
  AN_SERVICES,
  COURSES,
  CO_SECTORS,
  CO_SERVICES,
  GROUPS,
  SUBJECTS,
  VENUES,
  slug,
} from "@/content/sections";
import { getDb } from "@/lib/db";
import { siteUrl } from "@/lib/url";

export const dynamic = "force-dynamic"; // use the address of the running site, not the build machine

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/about", "/training", "/surveys", "/analytics", "/consultancy", "/resources", "/contact"];
  // Section pages, all with their own addresses so search engines can find them.
  const section = [
    ...["mission", "vision", "team", "organisation", "certificates"].map((p) => `/about/${p}`),
    ...["finder", "new", "certificates", "venues", "sectors"].map((p) => `/training/${p}`),
    ...GROUPS.map((g) => `/training/area/${g.id}`),
    ...Object.keys(SUBJECTS).map((k) => `/training/subject/${k}`),
    ...COURSES.map((c) => `/training/course/${c.id}`),
    ...VENUES.map((v) => `/training/venue/${slug(v.country)}`),
    ...AN_SERVICES.map((x) => `/analytics/service/${x.id}`),
    ...AN_SECTORS.map((x) => `/analytics/sector/${x.id}`),
    ...["tools", "how-we-work", "data-security", "request"].map((p) => `/analytics/${p}`),
    ...CO_SERVICES.map((x) => `/consultancy/service/${x.id}`),
    ...CO_SECTORS.map((x) => `/consultancy/sector/${x.id}`),
    ...["approach", "work-with-us", "request"].map((p) => `/consultancy/${p}`),
    ...[
      "articles",
      "case-studies",
      "testimonials",
      "press",
      "videos",
      "catalogues",
      "catalogues/training",
      "catalogues/services",
    ].map((p) => `/resources/${p}`),
    ...["hotel", "careers", "mailing-list"].map((p) => `/contact/${p}`),
    "/privacy",
    "/terms",
  ];
  return [
    ...pages.map((p) => ({ url: `${base}${p || "/"}`, changeFrequency: "weekly" as const, priority: p ? 0.8 : 1 })),
    ...section.map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...(await publishedCourseSlugs()).map((c) => ({
      url: `${base}/training/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...GUIDES.map((g) => ({
      url: `${base}/resources/guides/${g.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

async function publishedCourseSlugs() {
  try {
    return await getDb().course.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } });
  } catch {
    return [];
  }
}
