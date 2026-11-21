import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE, legalLine } from "@/lib/site";
import { siteUrl } from "@/lib/url";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: `${SITE.longName}. ${SITE.tagline}.`,
  metadataBase: new URL(siteUrl()),
  openGraph: { siteName: SITE.name, type: "website", locale: "en_GB" },
  formatDetection: { telephone: false },
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
          <b>{SITE.name}</b> · Centre for Research Methods and Analytics
          <br />
          <span className="hint">
            {SITE.tagline}. {legalLine()}
          </span>
        </footer>
      </body>
    </html>
  );
}
