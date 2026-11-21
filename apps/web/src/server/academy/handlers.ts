import "server-only";
import type { EnrollmentStatus, PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  ENROLLMENT_LABEL,
  ENROLLMENT_STATUSES,
  csvRow,
  formatDates,
  formatFee,
  isoDay,
  slugify,
  todayUtc,
} from "@/lib/academy";
import { audit } from "../audit";
import { handle } from "../auth/handlers";
import { requireSiteAdmin, requireUser, requireVerified } from "../auth/guards";
import { isSiteAdmin } from "../auth/roles";
import { authConfig, emailEnabled } from "../config";
import { brandEmail, sendInBackground } from "../email";
import { BadRequest, clientIp, fail, json, readJson, trustedBase } from "../http";
import { adminRecipients, getCourseById, listAllCoursesForAdmin, takenBySession } from "./service";
import { parseCourse } from "./validate";

class Conflict extends Error {}
const withoutId = <T extends { id?: string }>(s: T): Omit<T, "id"> => {
  const copy = { ...s };
  delete copy.id;
  return copy;
};
const conflictOr = async (fn: () => Promise<Response>) => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Conflict) return fail(409, "conflict", e.message);
    throw e;
  }
};

async function uniqueSlug(db: PrismaClient | Prisma.TransactionClient, title: string) {
  const base = slugify(title);
  for (let i = 1; i < 100; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await db.course.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ---------- administrators: courses ----------

export const adminListCourses = handle(async (req, db) => {
  const { error } = await requireSiteAdmin(db, req);
  if (error) return error;
  return json(200, { courses: await listAllCoursesForAdmin(db) });
});

export const adminCreateCourse = handle(async (req, db) => {
  const { user, error } = await requireSiteAdmin(db, req);
  if (error) return error;
  const { course, sessions } = parseCourse(await readJson(req, 100_000));
  const created = await db.$transaction(async (tx) => {
    const c = await tx.course.create({
      data: {
        ...course,
        slug: await uniqueSlug(tx, course.title),
        sessions: { create: sessions.map(withoutId) },
      },
    });
    await audit(tx, {
      actorId: user.id,
      action: "course.create",
      entityType: "Course",
      entityId: c.id,
      metadata: { title: c.title, status: c.status },
      ip: clientIp(req),
    });
    return c;
  });
  return json(200, { id: created.id, slug: created.slug });
});

export const adminUpdateCourse = (id: string) =>
  handle(async (req, db) => {
    const { user, error } = await requireSiteAdmin(db, req);
    if (error) return error;
    const { course, sessions } = parseCourse(await readJson(req, 100_000));
    const existing = await getCourseById(db, id);
    if (!existing) return fail(404, "not_found", "Course not found.");
    return conflictOr(async () => {
      await db.$transaction(async (tx) => {
        const known = new Map(existing.sessions.map((s) => [s.id, s]));
        const keep = new Set(sessions.map((s) => s.id).filter((x): x is string => !!x && known.has(x)));
        for (const old of existing.sessions)
          if (!keep.has(old.id) && old.taken > 0)
            throw new Conflict(
              `The date ${formatDates(old.startsOn, old.endsOn)} has ${old.taken} registration${old.taken === 1 ? "" : "s"}. Cancel them before removing the date.`,
            );
        for (const s of sessions) {
          const old = s.id ? known.get(s.id) : undefined;
          if (old && s.seats > 0 && s.seats < old.taken)
            throw new Conflict(
              `The date ${formatDates(old.startsOn, old.endsOn)} already has ${old.taken} people registered. Seats can't go below that.`,
            );
        }
        await tx.courseSession.deleteMany({ where: { courseId: id, id: { notIn: [...keep] } } });
        for (const { id: sid, ...s } of sessions) {
          if (sid && keep.has(sid)) await tx.courseSession.update({ where: { id: sid }, data: s });
          else await tx.courseSession.create({ data: { ...s, courseId: id } });
        }
        await tx.course.update({ where: { id }, data: course });
        await audit(tx, {
          actorId: user.id,
          action: existing.status !== course.status ? `course.${course.status.toLowerCase()}` : "course.update",
          entityType: "Course",
          entityId: id,
          metadata: { title: course.title, from: existing.status, to: course.status, dates: sessions.length },
          ip: clientIp(req),
        });
      });
      return json(200, { id, slug: existing.slug });
    });
  });

export const adminDeleteCourse = (id: string) =>
  handle(async (req, db) => {
    const { user, error } = await requireSiteAdmin(db, req);
    if (error) return error;
    const c = await db.course.findUnique({ where: { id }, include: { _count: { select: { enrollments: true } } } });
    if (!c) return fail(404, "not_found", "Course not found.");
    if (c._count.enrollments > 0)
      return fail(
        409,
        "conflict",
        "This course has registrations, so it can't be deleted. Archive it instead to hide it from the site.",
      );
    await db.$transaction([
      db.course.delete({ where: { id } }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: "course.delete",
          entityType: "Course",
          entityId: id,
          metadata: { title: c.title },
        },
      }),
    ]);
    return json(204, null);
  });

// ---------- registrations ----------

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export const register = handle(async (req, db) => {
  const { user, error } = await requireVerified(db, req, "register for courses");
  if (error) return error;
  const b = await readJson(req);
  const course = typeof b.courseId === "string" ? await db.course.findUnique({ where: { id: b.courseId } }) : null;
  if (!course || course.status !== "PUBLISHED")
    return fail(400, "invalid_argument", "That course isn't open for registration.");
  const sessionId = typeof b.sessionId === "string" && b.sessionId ? b.sessionId : null;
  const phone = clip(b.phone, 40);
  if (sessionId && !phone) return fail(400, "invalid_argument", "Add a phone number so we can confirm your place.");

  return conflictOr(async () => {
    const enrollment = await db.$transaction(async (tx) => {
      const already = await tx.enrollment.findFirst({
        where: { userId: user.id, courseId: course.id, sessionId, status: { not: "CANCELLED" } },
        select: { id: true },
      });
      if (already) throw new Conflict("You're already registered for this.");
      let session = null;
      if (sessionId) {
        // Lock the date so two people can't both take the last seat.
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "CourseSession" WHERE id = ${sessionId} AND "courseId" = ${course.id} FOR UPDATE`;
        if (!rows.length) throw new BadRequest("That date isn't part of this course any more.");
        session = await tx.courseSession.findUniqueOrThrow({ where: { id: sessionId } });
        if (session.startsOn && session.startsOn < todayUtc())
          throw new Conflict("That date has already started. Choose another date or register your interest.");
        const taken = (await takenBySession(tx, [sessionId])).get(sessionId) ?? 0;
        if (session.seats > 0 && taken >= session.seats)
          throw new Conflict("Sorry, this date is full. Choose another date or register your interest.");
      }
      try {
        return await tx.enrollment.create({
          data: {
            userId: user.id,
            courseId: course.id,
            sessionId,
            status: sessionId ? "REGISTERED" : "INTEREST",
            name: user.name || user.email,
            email: user.email,
            phone,
            organisation: clip(b.organisation, 120),
            notes: clip(b.notes, 1000),
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
          throw new Conflict("You're already registered for this.");
        throw e;
      }
    });
    await notifyAdmins(db, req, enrollment.id);
    return json(200, { id: enrollment.id, status: enrollment.status });
  });
});

async function notifyAdmins(db: PrismaClient, req: Request, enrollmentId: string) {
  if (!emailEnabled()) return;
  const e = await db.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: { course: true, session: true },
  });
  const to = await adminRecipients(db, authConfig().adminEmails);
  const base = trustedBase(req);
  const what = e.session
    ? `registered for ${e.course.title} (${formatDates(e.session.startsOn, e.session.endsOn)}${e.session.location ? `, ${e.session.location}` : ""}, ${formatFee(e.session.feeMinor, e.session.currency)})`
    : `registered interest in ${e.course.title}`;
  const body = brandEmail({
    paragraphs: [
      `${e.name} (${e.email}${e.phone ? `, ${e.phone}` : ""}${e.organisation ? `, ${e.organisation}` : ""}) ${what}.`,
      ...(e.notes ? [`Notes: ${e.notes}`] : []),
    ],
    button: "Open registrations",
    link: `${base ?? ""}/admin/registrations`,
    footer: "You're receiving this because you're an Afrimetrica site administrator.",
  });
  for (const addr of to)
    sendInBackground(addr, `New ${e.session ? "course registration" : "course interest"}: ${e.course.title}`, body);
}

export const myEnrollments = handle(async (req, db) => {
  const { user, error } = await requireUser(db, req);
  if (error) return error;
  const rows = await db.enrollment.findMany({
    where: { userId: user.id },
    include: { course: { select: { title: true, slug: true } }, session: true },
    orderBy: { createdAt: "desc" },
  });
  return json(200, { enrollments: rows });
});

export const updateEnrollment = (id: string) =>
  handle(async (req, db) => {
    const { user, error } = await requireUser(db, req);
    if (error) return error;
    const status = (await readJson(req)).status as EnrollmentStatus;
    if (!ENROLLMENT_STATUSES.includes(status)) return fail(400, "invalid_argument", "Unknown status.");
    const e = await db.enrollment.findUnique({ where: { id } });
    if (!e) return fail(404, "not_found", "Registration not found.");
    const admin = await isSiteAdmin(db, user.id);
    const ownCancel =
      e.userId === user.id && status === "CANCELLED" && (e.status === "REGISTERED" || e.status === "INTEREST");
    if (!ownCancel && !admin)
      return fail(
        403,
        "forbidden",
        e.userId === user.id
          ? "You can cancel your registration, but only Afrimetrica can change its status."
          : "That isn't your registration.",
      );
    if (admin && !ownCancel) {
      const v = await requireSiteAdmin(db, req);
      if (v.error) return v.error;
    }
    if (e.status === "CANCELLED" && status !== "CANCELLED") {
      // Re-activating must respect the one-active-registration rule and the seat limit.
      return conflictOr(() =>
        db.$transaction(async (tx) => {
          if (e.sessionId) {
            await tx.$queryRaw`SELECT id FROM "CourseSession" WHERE id = ${e.sessionId} FOR UPDATE`;
            const s = await tx.courseSession.findUniqueOrThrow({ where: { id: e.sessionId } });
            const taken = (await takenBySession(tx, [s.id])).get(s.id) ?? 0;
            if (s.seats > 0 && taken >= s.seats)
              throw new Conflict("That date is full, so this registration can't be restored.");
          }
          try {
            await tx.enrollment.update({ where: { id }, data: { status } });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
              throw new Conflict("This person already has an active registration for that date.");
            throw err;
          }
          await audit(tx, {
            actorId: user.id,
            action: "enrollment.status",
            entityType: "Enrollment",
            entityId: id,
            metadata: { from: e.status, to: status },
            ip: clientIp(req),
          });
          return json(200, { id, status });
        }),
      );
    }
    await db.$transaction([
      db.enrollment.update({ where: { id }, data: { status } }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: ownCancel ? "enrollment.cancel" : "enrollment.status",
          entityType: "Enrollment",
          entityId: id,
          metadata: { from: e.status, to: status },
        },
      }),
    ]);
    return json(200, { id, status });
  });

// ---------- administrators: registrations ----------

export const adminListEnrollments = handle(async (req, db) => {
  const { error } = await requireSiteAdmin(db, req);
  if (error) return error;
  const courseId = new URL(req.url).searchParams.get("course") || undefined;
  const rows = await db.enrollment.findMany({
    where: { courseId },
    include: { course: { select: { title: true } }, session: true },
    orderBy: { createdAt: "desc" },
  });
  return json(200, { enrollments: rows });
});

export const adminEnrollmentsCsv = handle(async (req, db) => {
  const { user, error } = await requireSiteAdmin(db, req);
  if (error) return error;
  const courseId = new URL(req.url).searchParams.get("course") || undefined;
  const rows = await db.enrollment.findMany({
    where: { courseId },
    include: { course: true, session: true },
    orderBy: { createdAt: "asc" },
  });
  const lines = [
    csvRow([
      "Registered on",
      "Name",
      "Email",
      "Phone",
      "Organisation",
      "Course",
      "Start date",
      "End date",
      "Venue",
      "Fee",
      "Status",
      "Notes",
    ]),
    ...rows.map((e) =>
      csvRow([
        isoDay(e.createdAt),
        e.name,
        e.email,
        e.phone,
        e.organisation,
        e.course.title,
        e.session ? isoDay(e.session.startsOn) : "interest only",
        e.session ? isoDay(e.session.endsOn) : "",
        e.session?.location ?? "",
        e.session ? formatFee(e.session.feeMinor, e.session.currency) : "",
        ENROLLMENT_LABEL[e.status],
        e.notes,
      ]),
    ),
  ];
  await audit(db, {
    actorId: user.id,
    action: "enrollment.export",
    entityType: "Enrollment",
    entityId: courseId ?? "all",
    metadata: { rows: rows.length },
    ip: clientIp(req),
  });
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afrimetrica-registrations-${isoDay(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
