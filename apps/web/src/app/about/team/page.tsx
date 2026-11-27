import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";
import { TEAM } from "@/content/team";

export const metadata: Metadata = {
  title: "Our team",
  description: "The trainers, researchers, analysts and consultants behind Afrimetrica.",
  alternates: { canonical: "/about/team" },
};

export default function Team() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/about", "About"],
          ["", "Our team"],
        ]}
      />
      <Head eyebrow="Our team" title="The people behind Afrimetrica">
        A core team of trainers, researchers, analysts and consultants, supported by an associate network of specialists
        and field staff across English-speaking Africa.
      </Head>
      {TEAM.length > 0 && (
        <section className="stack" aria-labelledby="team-h">
          <h2 id="team-h">Leadership and faculty</h2>
          <div className="team-grid">
            {TEAM.map((t) => (
              <article key={t.id} className="person" id={`team-${t.id}`}>
                <Image src={`/team/${t.photo}`} alt={`Portrait of ${t.name.split(",")[0]}`} width={150} height={150} />
                <div>
                  <h3>{t.name}</h3>
                  <p className="person-role">{t.role}</p>
                  <p className="muted">{t.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="card">
        <h2>Join us</h2>
        <p className="muted">
          We work with independent consultants, trainers, analysts, enumerators and field supervisors.
        </p>
        <div className="ctas tight">
          <Link className="btn primary" href="/consultancy/work-with-us">
            Join the associate network
          </Link>
          <Link className="btn" href="/contact/careers">
            Careers
          </Link>
        </div>
      </section>
    </main>
  );
}
