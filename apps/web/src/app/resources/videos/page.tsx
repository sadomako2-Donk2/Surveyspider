import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, Head } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Videos",
  description: "Tutorials on research methods and data analysis, and course previews.",
  alternates: { canonical: "/resources/videos" },
};

export default function Videos() {
  return (
    <main id="main" className="wrap stack">
      <Crumbs
        items={[
          ["/resources", "Resources"],
          ["", "Videos"],
        ]}
      />
      <Head eyebrow="Videos" title="Videos">
        Short tutorials on research methods and data analysis, and previews of our courses.
      </Head>
      <section className="card">
        <h2>Coming soon</h2>
        <p className="muted">
          Our first videos will be published here. In the meantime, our written guides cover the same ground.
        </p>
        <p>
          <Link className="btn primary" href="/resources/articles">
            Read the guides
          </Link>
        </p>
      </section>
    </main>
  );
}
