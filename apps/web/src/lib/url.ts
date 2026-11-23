/** The site's public address, for canonical links, the sitemap and social previews. */
export function siteUrl(): string {
  const raw = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * Google Search Console's ownership code, from GOOGLE_SITE_VERIFICATION (the "HTML tag" method).
 * Accepts the code alone or the whole pasted <meta> tag; anything else is ignored.
 */
export function googleSiteVerification(raw = process.env.GOOGLE_SITE_VERIFICATION): string | undefined {
  const code = (raw ?? "").trim().replace(/^.*content="([^"]+)".*$/s, "$1");
  return /^[A-Za-z0-9_-]{10,100}$/.test(code) ? code : undefined;
}
