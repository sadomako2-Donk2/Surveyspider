import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/surveys/ParticipantControls";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { getDb } from "@/lib/db";
import { eligible, hourlyRate } from "@/lib/surveys";
import { signedInPage } from "@/server/surveys/pages";
import { countingResponses, screeningOf } from "@/server/surveys/service";

export const metadata: Metadata = { title: "Take surveys", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TakeSurveys() {
  const user = await signedInPage("/surveys/take");
  const db = getDb();
  const profile = await db.participantProfile.findUnique({ where: { userId: user.id } });
  const surveys = await db.survey.findMany({
    where: { status: "LIVE", ownerId: { not: user.id }, responses: { none: { participantId: user.id } } },
    include: {
      versions: {
        where: { publishedAt: { not: null } },
        orderBy: { number: "desc" },
        take: 1,
        include: { _count: { select: { questions: true } } },
      },
    },
    orderBy: { launchedAt: "desc" },
    take: 200,
  });
  const open = [];
  for (const s of surveys)
    if (eligible(screeningOf(s.screening), profile) && (await countingResponses(db, s.id)) < s.targetResponses)
      open.push(s);
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="take" />
      <div className="page-head">
        <span className="eyebrow">Afrimetrica Surveys</span>
        <h1>Take surveys</h1>
        <p className="lede">Answer research surveys. Some pay a reward; the hourly rate is shown on each.</p>
      </div>
      <ProfileForm
        initial={
          profile
            ? { age: profile.age, gender: profile.gender, country: profile.country, occupation: profile.occupation }
            : null
        }
      />
      <section className="stack">
        <h2>Surveys you can take</h2>
        {open.length ? (
          <div className="course-grid">
            {open.map((s) => {
              const v = s.versions[0]!;
              return (
                <article key={s.id} className="card course">
                  <h3>
                    <Link className="stretched" href={`/s/${s.id}`}>
                      {v.title}
                    </Link>
                  </h3>
                  <p className="muted">{v.description}</p>
                  <div className="course-meta">
                    <span>
                      {v._count.questions} questions · about {s.estimatedMinutes} min
                    </span>
                    <span>
                      {s.rewardMinor > 0
                        ? `US$${(s.rewardMinor / 100).toFixed(2)} · about US$${hourlyRate(s.rewardMinor, s.estimatedMinutes).toFixed(2)} an hour`
                        : "No reward"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">
            {profile
              ? "No surveys are looking for someone like you right now. Check back soon."
              : "Fill in your profile to see surveys that match you."}
          </p>
        )}
      </section>
    </main>
  );
}
