import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";
import { ABOUT } from "@/content/sections";

export const metadata: Metadata = {
  title: "How we're organised",
  description: "Afrimetrica's units: Academy, Surveys, Analytics, Consulting and the Knowledge Hub.",
  alternates: { canonical: "/about/organisation" },
};

export default function Organisation() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/about", "About"],
          ["", "How we're organised"],
        ]}
      />
      <Head eyebrow="How we're organised" title="One organisation, five units">
        Each part of Afrimetrica focuses on one way of helping organisations make better decisions, and they work
        together on larger assignments.
      </Head>
      <section className="card">
        <dl className="kv">
          {ABOUT.units.map((u) => (
            <div key={u.role} className="kv-row">
              <dt>{u.role}</dt>
              <dd>{u.href ? <Link href={u.href}>{u.name}</Link> : u.name}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
