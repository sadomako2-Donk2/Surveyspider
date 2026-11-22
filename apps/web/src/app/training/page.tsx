import type { Metadata } from "next";
import { CourseCard } from "@/components/academy/CourseCard";
import Link from "next/link";
import { AreaCards, Head } from "@/components/site/sections";
import { Slideshow } from "@/components/site/Slideshow";
import { TrainingAsk } from "@/components/training/TrainingAsk";
import { COURSES } from "@/content/sections";
import { slidesStartingWith } from "@/content/photos";
import { getDb } from "@/lib/db";
import { listPublishedCourses } from "@/server/academy/service";
import { courseCardView } from "@/server/academy/view";

export const metadata: Metadata = {
  title: "Data, research and executive training",
  description:
    "Afrimetrica Academy: practical data, research and executive training for organisations, governments and NGOs, in the classroom across English-speaking Africa, live online or in-house.",
  alternates: { canonical: "/training" },
};
export const dynamic = "force-dynamic"; // dates and seats change as people register

async function courses() {
  try {
    return (await listPublishedCourses(getDb())).map(courseCardView);
  } catch (e) {
    console.error("Couldn't load courses:", e instanceof Error ? e.message : e);
    return null;
  }
}

export default async function Training() {
  const list = await courses();
  return (
    <main id="main" className="wrap stack xl">
      <Head eyebrow="Afrimetrica Academy · Plan. Analyse. Lead." title="Data, research and executive training">
        Practical training that helps organisations, governments and NGOs make better decisions and deliver results.
      </Head>
      <p className="muted" style={{ maxWidth: "70ch", marginTop: -12 }}>
        Build skills in research design, surveys, statistics, monitoring and evaluation, dashboards and market research,
        alongside executive programmes in strategy and strategic planning, leadership, governance, finance and project
        management. Join a classroom course in a city near you, learn live online, or bring any course to your
        organisation, tailored to your sector and your team.
      </p>
      <Slideshow slides={slidesStartingWith("training", "homeAcademy")} />
      <form className="card quick-find" action="/training/finder" role="search">
        <label>
          Search {COURSES.length} courses
          <input name="q" type="search" placeholder="e.g. strategy, Power BI, monitoring and evaluation" />
        </label>
        <button className="btn primary" type="submit">
          Find courses
        </button>
      </form>
      <section className="stack" aria-labelledby="areas-h">
        <div className="section-head">
          <span className="eyebrow">Courses</span>
          <h2 id="areas-h" className="h2xl">
            Start with a subject area
          </h2>
        </div>
        <AreaCards />
      </section>
      {list && list.length > 0 && (
        <section className="stack" aria-labelledby="courses-h">
          <div className="section-head">
            <span className="eyebrow">Scheduled dates</span>
            <h2 id="courses-h" className="h2xl">
              Courses open for registration
            </h2>
          </div>
          <div className="course-grid">
            {list.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
      <section className="units" aria-label="Ways to learn">
        {[
          [
            "Classroom",
            "Public courses",
            "Learn alongside professionals from other organisations, in a city near you.",
          ],
          [
            "Live online",
            "Online with a trainer",
            "The same course, taught live in short daily sessions you can join from anywhere.",
          ],
          [
            "In-house",
            "For your organisation",
            "Any course, adapted to your data, sector and team, at your premises or online.",
          ],
          ["Tailored", "Designed for you", "Need something not listed? We build programmes around your goals."],
        ].map(([e, t, d]) => (
          <article key={e} className="card unit">
            <span className="eyebrow">{e}</span>
            <h3>{t}</h3>
            <p className="muted">
              {d} {e === "Classroom" && <Link href="/training/venues">See venues</Link>}
            </p>
          </article>
        ))}
      </section>
      <TrainingAsk title="Ask about dates, fees or in-house training" />
    </main>
  );
}
