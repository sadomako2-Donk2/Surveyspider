import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE, legalLine } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: `${SITE.longName}. ${SITE.tagline}.`,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
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
