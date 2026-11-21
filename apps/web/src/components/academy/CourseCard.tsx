import Link from "next/link";
import type { CourseCardView } from "@/server/academy/view";

export function CourseCard({ c }: { c: CourseCardView }) {
  return (
    <article className="card course">
      <div className="pills">
        {c.tags.map((t) => (
          <span key={t} className="pill">
            {t}
          </span>
        ))}
      </div>
      <h3>
        <Link className="stretched" href={`/training/${c.slug}`}>
          {c.title}
        </Link>
      </h3>
      <p className="muted">{c.summary}</p>
      <div className="course-meta">
        {c.next ? (
          <>
            <span>
              <b>{c.next.dates}</b>
              {c.next.location ? ` · ${c.next.location}` : ""}
            </span>
            <span>
              {c.next.fee} · {c.next.seats}
            </span>
          </>
        ) : (
          <span>Dates to be announced</span>
        )}
      </div>
    </article>
  );
}
