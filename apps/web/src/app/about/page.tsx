import type { Metadata } from "next";
import { Head, LinkCards } from "@/components/site/sections";
import { Slideshow } from "@/components/site/Slideshow";
import { slidesStartingWith } from "@/content/photos";

export const metadata: Metadata = {
  title: "About",
  description:
    "Afrimetrica trains leaders and teams, collects and analyses data, and advises organisations, governments and NGOs in Africa and around the world.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <main id="main" className="wrap stack xl">
      <Head eyebrow="About Afrimetrica" title="Data, research and executive training for better decisions">
        Afrimetrica trains leaders and teams, collects and analyses data, and advises organisations, governments and
        NGOs in Africa and around the world. Our courses range from research methods and statistics to strategy,
        leadership and governance. Every course is practical, grounded in evidence and built around the decisions
        participants make at work.
      </Head>
      <Slideshow slides={slidesStartingWith("about")} />
      <LinkCards
        cards={(
          [
            ["mission", "Our mission", "Why we exist and what we stand for"],
            ["vision", "Our vision", "The future we are working towards"],
            ["team", "Our team", "The people behind Afrimetrica"],
            ["organisation", "How we're organised", "Our training, survey, analytics, consultancy and resources units"],
            ["certificates", "About our certificates", "What our certificates of completion mean"],
          ] as [string, string, string][]
        ).map(([k, title, text]) => ({ href: `/about/${k}`, title, text }))}
      />
    </main>
  );
}
