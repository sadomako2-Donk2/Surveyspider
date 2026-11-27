import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";
import { LEADERSHIP, TEAM, initials, type TeamMember } from "@/content/team";

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
        and field staff in Africa and around the world.
      </Head>
      <section className="stack" aria-labelledby="lead-h">
        <h2 id="lead-h">Leadership team</h2>
        <div className={LEADERSHIP.some((l) => l.name) ? "team-grid" : "leader-grid"}>
          {LEADERSHIP.map((l) =>
            l.name ? (
              <Person
                key={l.role}
                t={{ id: l.abbr.toLowerCase(), name: l.name, role: l.role, photo: l.photo, bio: l.bio ?? "" }}
              />
            ) : (
              <article key={l.role} className="leader-role">
                <div className="person-initials" aria-hidden="true">
                  {l.abbr}
                </div>
                <h3>{l.role}</h3>
              </article>
            ),
          )}
        </div>
      </section>
      {TEAM.length > 0 && (
        <section className="stack" aria-labelledby="team-h">
          <h2 id="team-h">Ad hoc consultants</h2>
          <div className="team-grid">
            {TEAM.map((t) => (
              <Person key={t.id} t={t} />
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

/** One profile: black-and-white photo (or initials until there is one), name, role and bio. */
function Person({ t }: { t: TeamMember }) {
  return (
    <article className="person" id={`team-${t.id}`}>
      {t.photo ? (
        <Image src={`/team/${t.photo}`} alt={`Portrait of ${t.name.split(",")[0]}`} width={150} height={150} />
      ) : (
        <div className="person-initials" aria-hidden="true">
          {initials(t.name)}
        </div>
      )}
      <div>
        <h3>{t.name}</h3>
        <p className="person-role">{t.role}</p>
        <p className="muted">{t.bio}</p>
      </div>
    </article>
  );
}
