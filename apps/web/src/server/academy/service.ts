import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { todayUtc } from "@/lib/academy";

/** Active registrations per session (everything except cancelled). */
export async function takenBySession(db: PrismaClient | Prisma.TransactionClient, sessionIds: string[]) {
  if (!sessionIds.length) return new Map<string, number>();
  const rows = await db.enrollment.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessionIds }, status: { not: "CANCELLED" } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.sessionId!, r._count._all]));
}

const courseWithSessions = {
  sessions: { orderBy: [{ startsOn: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] },
} satisfies Prisma.CourseInclude;

async function withSeats<T extends { sessions: { id: string }[] }>(db: PrismaClient, courses: T[]) {
  const taken = await takenBySession(
    db,
    courses.flatMap((c) => c.sessions.map((s) => s.id)),
  );
  // (Spreading a generic object gives an intersection type, so state the result explicitly.)
  return courses.map(
    (c) =>
      ({ ...c, sessions: c.sessions.map((s) => ({ ...s, taken: taken.get(s.id) ?? 0 })) }) as Omit<T, "sessions"> & {
        sessions: (T["sessions"][number] & { taken: number })[];
      },
  );
}

export type CourseWithSeats = Awaited<ReturnType<typeof listPublishedCourses>>[number];

/** Published courses, soonest upcoming date first; courses without upcoming dates last. */
export async function listPublishedCourses(db: PrismaClient) {
  const courses = await withSeats(
    db,
    await db.course.findMany({ where: { status: "PUBLISHED" }, include: courseWithSessions }),
  );
  const today = todayUtc().getTime();
  const next = (c: (typeof courses)[number]) =>
    c.sessions.find((s) => !s.startsOn || s.startsOn.getTime() >= today)?.startsOn?.getTime() ??
    Number.MAX_SAFE_INTEGER;
  return courses.sort((a, b) => next(a) - next(b) || a.title.localeCompare(b.title));
}

export async function getCourseBySlug(db: PrismaClient, slug: string, opts: { includeUnpublished?: boolean } = {}) {
  const c = await db.course.findUnique({ where: { slug }, include: courseWithSessions });
  if (!c || (c.status !== "PUBLISHED" && !opts.includeUnpublished)) return null;
  return (await withSeats(db, [c]))[0]!;
}

export async function getCourseById(db: PrismaClient, id: string) {
  const c = await db.course.findUnique({ where: { id }, include: courseWithSessions });
  return c ? (await withSeats(db, [c]))[0]! : null;
}

export async function listAllCoursesForAdmin(db: PrismaClient) {
  const courses = await db.course.findMany({
    include: {
      ...courseWithSessions,
      _count: { select: { enrollments: { where: { status: { not: "CANCELLED" } } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return courses;
}

export const upcomingSessions = <S extends { startsOn: Date | null }>(sessions: S[]) => {
  const today = todayUtc().getTime();
  return sessions.filter((s) => !s.startsOn || s.startsOn.getTime() >= today);
};

/** Who gets an email when someone registers: confirmed site admins plus ADMIN_EMAILS. */
export async function adminRecipients(db: PrismaClient, envEmails: string[]) {
  const admins = await db.membership.findMany({
    where: {
      organisation: { slug: "afrimetrica" },
      role: { in: ["OWNER", "ADMIN"] },
      user: { emailVerifiedAt: { not: null } },
    },
    select: { user: { select: { email: true } } },
  });
  return [...new Set([...admins.map((a) => a.user.email), ...envEmails])];
}
