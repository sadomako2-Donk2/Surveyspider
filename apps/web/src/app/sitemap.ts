import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/pages";
import { siteUrl } from "@/lib/url";

export const dynamic = "force-dynamic"; // use the address of the running site, not the build machine

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages = ["", "/about", "/training", "/surveys", "/analytics", "/consultancy", "/resources", "/contact"];
  return [
    ...pages.map((p) => ({ url: `${base}${p || "/"}`, changeFrequency: "weekly" as const, priority: p ? 0.8 : 1 })),
    ...GUIDES.map((g) => ({
      url: `${base}/resources/guides/${g.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
