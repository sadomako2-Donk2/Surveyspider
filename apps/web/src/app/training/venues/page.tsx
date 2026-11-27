import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/site/Photo";
import { Crumbs, Head } from "@/components/site/sections";
import { VENUE_REGIONS, slug } from "@/content/sections";

export const metadata: Metadata = {
  title: "Training venues",
  description: "Afrimetrica Academy classroom training venues in Africa and around the world.",
  alternates: { canonical: "/training/venues" },
};

export default function Venues() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/training", "Training"],
          ["", "Training venues"],
        ]}
      />
      <div className="feature">
        <Photo slot="venuesCity" />
        <Head eyebrow="Training venues" title="Where we train">
          Classroom courses can run in these cities in Africa, Europe, Asia and North America. Dates are set for each
          venue: ask for the dates and fees for the course and city you want, learn live online, or bring any course to
          your own premises.
        </Head>
      </div>
      {VENUE_REGIONS.map(([region, list]) => (
        <section key={region} className="stack" aria-labelledby={`vr-${slug(region)}`}>
          <h2 id={`vr-${slug(region)}`}>{region}</h2>
          <div className="venue-grid">
            {list.map((v) => (
              <Link key={v.country} className="venue" href={`/training/venue/${slug(v.country)}`}>
                <b>{v.country}</b>
                <span>{v.cities.join(" · ")}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
