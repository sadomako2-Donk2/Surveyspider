import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { RegisterPanel } from "@/components/academy/RegisterPanel";
import { Ticks } from "@/components/site/blocks";
import { getDb } from "@/lib/db";
import { getCourseBySlug } from "@/server/academy/service";
import { sessionView } from "@/server/academy/view";
import { needsVerification } from "@/server/auth/users";
import { getCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const load = cache((slug: string) => getCourseBySlug(getDb(), slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return { title: "Course not found" };
  return { title: c.title, description: c.summary, alternates: { canonical: `/training/${c.slug}` } };
}

export default async function CoursePage({ params }: Props) {
  const c = await load((await params).slug);
  if (!c) notFound();
  const user = await getCurrentUser();
  const mine = user
    ? await getDb().enrollment.findMany({
        where: { userId: user.id, courseId: c.id, status: { not: "CANCELLED" } },
        select: { sessionId: true },
      })
    : [];
  const mySessions = new Set(mine.map((e) => e.sessionId));
  const paragraphs = c.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <main id="main" className="wrap stack">
      <nav aria-label="Breadcrumb" className="hint">
        <Link href="/training">Training</Link> › {c.title}
      </nav>
      <header className="page-head">
        <span className="eyebrow">Afrimetrica Academy</span>
        <h1>{c.title}</h1>
        <div className="pills">
          {[c.level, c.format, c.duration].filter(Boolean).map((x) => (
            <span key={x} className="pill">
              {x}
            </span>
          ))}
        </div>
      </header>
      <div className="detail-grid">
        <div className="stack">
          <section className="card prose">
            <p className="lede">{c.summary}</p>
            {paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </section>
          {c.outcomes.length > 0 && (
            <section className="card">
              <h2>You will be able to</h2>
              <Ticks small items={c.outcomes} />
            </section>
          )}
          {c.audience && (
            <section className="card">
              <h2>Who it&apos;s for</h2>
              <p className="muted">{c.audience}</p>
            </section>
          )}
        </div>
        <aside className="stack">
          <RegisterPanel
            courseId={c.id}
            slug={c.slug}
            sessions={c.sessions.map((s) => ({ ...sessionView(s), mine: mySessions.has(s.id) }))}
            interestRegistered={mySessions.has(null)}
            signedIn={!!user}
            needsVerification={needsVerification(user)}
            certificate={c.certificate}
          />
        </aside>
      </div>
    </main>
  );
}
