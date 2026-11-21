import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/pages";
import { getDb } from "@/lib/db";
import { siteUrl } from "@/lib/url";

export const dynamic = "force-dynamic"; // use the address of the running site, not the build machine

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/about", "/training", "/surveys", "/analytics", "/consultancy", "/resources", "/contact"];
  return [
    ...pages.map((p) => ({ url: `${base}${p || "/"}`, changeFrequency: "weekly" as const, priority: p ? 0.8 : 1 })),
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
