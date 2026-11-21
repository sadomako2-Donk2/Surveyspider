/** The site's public address, for canonical links, the sitemap and social previews. */
export function siteUrl(): string {
  const raw = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
