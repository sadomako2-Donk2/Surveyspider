import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { TakeSurvey } from "@/components/surveys/TakeSurvey";
import { getDb } from "@/lib/db";
import { eligible } from "@/lib/surveys";
import { needsVerification } from "@/server/auth/users";
import { getCurrentUser } from "@/server/current-user";
import { countingResponses, loadSurvey, publishedVersion, questionView, screeningOf } from "@/server/surveys/service";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
const load = cache((id: string) => loadSurvey(getDb(), id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await load((await params).id);
  const v = s && s.status === "LIVE" ? publishedVersion(s) : null;
  return { title: v?.title ?? "Survey", robots: { index: false } };
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main" className="wrap stack narrow-page">
      <section className="card">
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}

export default async function TakeSurveyPage({ params }: Props) {
  const { id } = await params;
  const s = await load(id);
  const v = s && s.status === "LIVE" ? publishedVersion(s) : null;
  if (!s || !v)
    return (
      <Message title="This survey isn't open">
        <p className="muted">It may have closed or the link may be wrong.</p>
        <Link className="btn" href="/surveys/take">
          Find other surveys
        </Link>
      </Message>
    );
  const user = await getCurrentUser();
  if (!user)
    return (
      <Message title={v.title}>
        <p className="muted">{v.description}</p>
        <p>
          Sign in or create a free account to take this survey. Your name and email are never shown to the researcher.
        </p>
        <div className="ctas tight">
          <Link className="btn primary" href={`/signup?next=/s/${id}`}>
            Create a free account
          </Link>
          <Link className="btn" href={`/signin?next=/s/${id}`}>
            Sign in
          </Link>
        </div>
      </Message>
    );
  if (needsVerification(user))
    return (
      <Message title="Confirm your email first">
        <p className="muted">We sent a link to {user.email}. Confirm your address, then come back to this page.</p>
        <Link className="btn" href="/account">
          Resend the link from My Account
        </Link>
      </Message>
    );
  const db = getDb();
  const isOwner = s.ownerId === user.id;
  if (await db.response.findUnique({ where: { surveyId_participantId: { surveyId: id, participantId: user.id } } }))
    return (
      <Message title="You've already taken this survey">
        <p className="muted">Thank you. Each person can answer once.</p>
        <Link className="btn" href="/surveys/take">
          Find other surveys
        </Link>
      </Message>
    );
  if (!isOwner) {
    const profile = await db.participantProfile.findUnique({ where: { userId: user.id } });
    if (!eligible(screeningOf(s.screening), profile))
      return (
        <Message
          title={
            profile ? "This survey is looking for different participants" : "Set up your participant profile first"
          }
        >
          <p className="muted">
            {profile
              ? "Thanks for your interest. Other surveys may suit you."
              : "This survey is for particular groups of people. Your profile tells us whether you match."}
          </p>
          <Link className="btn primary" href="/surveys/take">
            {profile ? "Find other surveys" : "Set up my profile"}
          </Link>
        </Message>
      );
    if ((await countingResponses(db, id)) >= s.targetResponses)
      return (
        <Message title="This survey is full">
          <p className="muted">It has all the responses it needs. Thanks for your interest.</p>
        </Message>
      );
  }
  return (
    <main id="main" className="wrap stack narrow-page">
      <TakeSurvey
        surveyId={id}
        versionId={v.id}
        title={v.title}
        description={v.description}
        consentText={v.consentText}
        questions={v.questions.map(questionView)}
        attentionCheck={s.attentionCheck}
        test={isOwner}
      />
    </main>
  );
}
