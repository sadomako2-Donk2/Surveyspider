import { siteUrl } from "@/lib/url";

// Structured data for search engines (schema.org). Kept to facts that are on the page.
const DESCRIPTION =
  "Data, research and executive training, survey tools, data analysis and consultancy for organisations, governments and NGOs across Africa.";

export function organizationLd(base = siteUrl()) {
  return {
    "@type": "Organization",
    name: "Afrimetrica",
    url: `${base}/`,
    logo: `${base}/brand/logo-full.webp`,
    description: DESCRIPTION,
  };
}

export function courseLd(c: { id: string; title: string; summary: string }, base = siteUrl()) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: c.title,
    description: c.summary,
    url: `${base}/training/course/${c.id}`,
    provider: organizationLd(base),
  };
}

/** `<` is escaped so text in the data can never close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
