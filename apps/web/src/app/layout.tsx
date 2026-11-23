import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/lib/site";
import { bingSiteVerification, googleSiteVerification, siteUrl } from "@/lib/url";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description:
    "Data, research and executive training, survey tools, data analysis and consultancy for organisations, governments and NGOs across Africa.",
  metadataBase: new URL(siteUrl()),
  openGraph: {
    siteName: SITE.name,
    type: "website",
    locale: "en_GB",
    images: [{ url: "/social.jpg", width: 1200, height: 630, alt: "Afrimetrica: Data, Research, Executive Training" }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  verification: {
    google: googleSiteVerification(),
    other: bingSiteVerification() ? { "msvalidate.01": bingSiteVerification()! } : undefined,
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <footer className="wrap foot">
          {/* eslint-disable-next-line @next/next/no-img-element -- the supplied logo, already sized */}
          <img
            className="foot-logo"
            src="/brand/logo-full.webp"
            width={216}
            height={72}
            alt="Afrimetrica: Data, Research, Executive Training"
          />
          <b>{SITE.name}</b> · Data, Research and Executive Training
          <br />
          <span className="hint">
            {SITE.tagline} Training, data and advice for organisations, governments and NGOs across Africa.
          </span>
          <br />
          <span className="hint">
            <Link href="/privacy">Privacy notice</Link> · <Link href="/terms">Terms of use</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
