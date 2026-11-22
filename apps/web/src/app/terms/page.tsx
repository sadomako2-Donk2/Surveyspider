import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { TERMS } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply when you use the Afrimetrica website and its services.",
  alternates: { canonical: "/terms" },
};
export default function Terms() {
  return <LegalPage doc={TERMS} />;
}
