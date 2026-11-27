import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaCards, Crumbs, Head } from "@/components/site/sections";
import { TrainingAsk } from "@/components/training/TrainingAsk";
import { VENUES, country, inCountry, slug, venueCity } from "@/content/sections";

type P = { params: Promise<{ country: string }> };
export const generateStaticParams = () => VENUES.map((v) => ({ country: slug(v.country) }));
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const v = country((await params).country);
  return v
    ? {
        title: `Training courses in ${inCountry(v.country)}`,
        description: `Classroom training in ${v.cities.join(", ")}, or in-house at your organisation in ${inCountry(v.country)}.`,
        alternates: { canonical: `/training/venue/${slug(v.country)}` },
      }
    : {};
}

export default async function Venue({ params }: P) {
  const v = country((await params).country);
  if (!v) notFound();
  const cities = v.cities.length > 1 ? `${v.cities.slice(0, -1).join(", ")} and ${v.cities.at(-1)}` : v.cities[0];
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ["/training/venues", "Training venues"],
          ["", v.country],
        ]}
      />
      <Head eyebrow="Training venue" title={`Training courses in ${inCountry(v.country)}`}>
        Every course in our catalogue can run as a classroom course in {cities}, or in-house at your organisation in{" "}
        {inCountry(v.country)}. Choose a city to find courses, then ask us for dates and fees.
      </Head>
      <div className="venue-grid">
        {v.cities.map((c) => (
          <Link
            key={c}
            className="venue"
            href={`/training/finder?venue=${encodeURIComponent(venueCity(c, v.country))}`}
          >
            <b>{c}</b>
            <span>Find courses in {c} →</span>
          </Link>
        ))}
      </div>
      <section className="stack">
        <h2>Browse by subject area</h2>
        <AreaCards />
      </section>
      <TrainingAsk
        title={`Ask about training in ${inCountry(v.country)}`}
        message={`Preferred venue: ${venueCity(v.cities[0]!, v.country)}\nCourse: \nNumber of participants: `}
      />
    </main>
  );
}
