import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { PRIVACY } from "@/content/legal";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What personal data Afrimetrica collects, why, who we share it with and your rights.",
  alternates: { canonical: "/privacy" },
};
export default function Privacy() {
  return <LegalPage doc={PRIVACY} />;
}
