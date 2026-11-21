import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "./helpers";
import { browser, startFakes } from "./fakes";
import { signedIn } from "./accounts";
import * as A from "@/server/academy/handlers";
import { listPublishedCourses } from "@/server/academy/service";

let fakes: Awaited<ReturnType<typeof startFakes>>;
const bind = (f: (req: Request, d: typeof db) => Promise<Response>) => (req: Request) => f(req, db);
const createCourse = bind(A.adminCreateCourse),
  listAdmin = bind(A.adminListCourses),
  register = bind(A.register);
const mine = bind(A.myEnrollments),
  adminList = bind(A.adminListEnrollments),
  csv = bind(A.adminEnrollmentsCsv);
const update = (id: string) => (req: Request) => A.adminUpdateCourse(id)(req, db);
const remove = (id: string) => (req: Request) => A.adminDeleteCourse(id)(req, db);
const setStatus = (id: string) => (req: Request) => A.updateEnrollment(id)(req, db);

const course = (over: Record<string, unknown> = {}) => ({
  title: "Questionnaire Design",
  status: "DRAFT",
  level: "Introductory",
  format: "Online",
  duration: "2 days",
  summary: "Write better questions.",
  description: "Long text.",
  outcomes: ["One", "Two"],
  audience: "Everyone",
  certificate: true,
  sessions: [
    { startsOn: "2099-03-01", endsOn: "2099-03-02", location: "Accra", seats: 1, fee: "1200", currency: "GHS" },
    { startsOn: "2099-04-01", location: "Zoom", seats: 0, fee: "0", currency: "USD" },
  ],
  ...over,
});

let admin: Awaited<ReturnType<typeof signedIn>>;
beforeAll(async () => {
  fakes = await startFakes("unused");
  Object.assign(process.env, {
    PUBLIC_URL: "https://afrimetrica.test",
    RESEND_API_KEY: "test-resend-key",
    RESEND_API_URL: `${fakes.base}/emails`,
    ADMIN_EMAILS: "owner-inbox@example.com",
  });
  admin = await signedIn({ siteAdmin: true, email: "academy-admin@example.com" });
});
afterAll(async () => {
  await fakes.close();
  await db.$disconnect();
});
beforeEach(() => {
  process.env.RESEND_API_KEY = "test-resend-key";
});

async function publishedCourse(over: Record<string, unknown> = {}) {
  const r = await admin.call(createCourse, {
    body: course({ status: "PUBLISHED", title: `Course ${Math.random().toString(36).slice(2, 7)}`, ...over }),
  });
  expect(r.status).toBe(200);
  const c = await db.course.findUniqueOrThrow({
    where: { id: r.json!.id },
    include: { sessions: { orderBy: { startsOn: "asc" } } },
  });
  return { ...c, dated: c.sessions[0]!, open: c.sessions[1]! };
}

describe("managing courses", () => {
  it("is for site administrators only", async () => {
    expect((await browser("10.30.0.1").call(createCourse, { body: course() })).status).toBe(401);
    const user = await signedIn();
    expect((await user.call(createCourse, { body: course() })).status).toBe(403);
    expect((await user.call(listAdmin)).status).toBe(403);
    const unconfirmedAdmin = await signedIn({ siteAdmin: true, verified: false });
    expect((await unconfirmedAdmin.call(createCourse, { body: course() })).json!.code).toBe("verify_required");
  });

  it("creates a course with dates, a readable address and an audit entry", async () => {
    const r = await admin.call(createCourse, { body: course({ title: "Sampling & Sample Size" }) });
    expect(r.status).toBe(200);
    expect(r.json!.slug).toBe("sampling-and-sample-size");
    const c = await db.course.findUniqueOrThrow({ where: { id: r.json!.id }, include: { sessions: true } });
    expect(c.sessions.map((s) => [s.feeMinor, s.currency]).sort()).toEqual([
      [0, "USD"],
      [120000, "GHS"],
    ]);
    expect(await db.auditEvent.count({ where: { action: "course.create", entityId: c.id } })).toBe(1);
    const again = await admin.call(createCourse, { body: course({ title: "Sampling & Sample Size" }) });
    expect(again.json!.slug).toBe("sampling-and-sample-size-2");
  });

  it("rejects bad input with a clear message", async () => {
    const bad = async (over: Record<string, unknown>) =>
      (await admin.call(createCourse, { body: course(over) })).json!.message as string;
    expect(await bad({ title: " " })).toMatch(/title/);
    expect(await bad({ status: "LIVE" })).toMatch(/Status/);
    expect(await bad({ sessions: [{ startsOn: "2099-02-30", currency: "USD" }] })).toMatch(/Date 1: the start date/);
    expect(await bad({ sessions: [{ startsOn: "2099-03-02", endsOn: "2099-03-01" }] })).toMatch(/before the start/);
    expect(await bad({ sessions: [{ seats: -1 }] })).toMatch(/seats/);
    expect(await bad({ sessions: [{ fee: "12.345" }] })).toMatch(/fee/);
    expect(await bad({ sessions: [{ currency: "BTC" }] })).toMatch(/currency/);
  });

  it("hides drafts and archived courses from visitors", async () => {
    const draft = await admin.call(createCourse, { body: course({ title: "Hidden draft" }) });
    const pub = await publishedCourse();
    const visible = (await listPublishedCourses(db)).map((c) => c.id);
    expect(visible).toContain(pub.id);
    expect(visible).not.toContain(draft.json!.id);
    await admin.call(update(pub.id), { method: "PUT", body: course({ title: pub.title, status: "ARCHIVED" }) });
    expect((await listPublishedCourses(db)).map((c) => c.id)).not.toContain(pub.id);
    expect(await db.auditEvent.count({ where: { action: "course.archived", entityId: pub.id } })).toBe(1);
  });
});

describe("registering", () => {
  it("needs a published course, an account and a confirmed email", async () => {
    const draft = await admin.call(createCourse, { body: course() });
    const u = await signedIn();
    expect((await u.call(register, { body: { courseId: draft.json!.id } })).status).toBe(400);
    const c = await publishedCourse();
    expect(
      (await browser("10.30.1.1").call(register, { body: { courseId: c.id, sessionId: c.dated.id } })).status,
    ).toBe(401);
    const unconfirmed = await signedIn({ verified: false });
    expect(
      (await unconfirmed.call(register, { body: { courseId: c.id, sessionId: c.dated.id, phone: "1" } })).json!.code,
    ).toBe("verify_required");
  });

  it("uses the account's own details and starts as Registered, whatever is sent", async () => {
    const c = await publishedCourse();
    const u = await signedIn({ name: "Yaw Owusu" });
    expect((await u.call(register, { body: { courseId: c.id, sessionId: c.open.id } })).json!.message).toMatch(/phone/);
    const r = await u.call(register, {
      body: {
        courseId: c.id,
        sessionId: c.open.id,
        phone: "+233 24 111 2222",
        email: "spoof@evil.example",
        userId: admin.user.id,
        status: "COMPLETED",
      },
    });
    expect(r.status).toBe(200);
    const e = await db.enrollment.findUniqueOrThrow({ where: { id: r.json!.id } });
    expect(e).toMatchObject({ email: u.user.email, userId: u.user.id, name: "Yaw Owusu", status: "REGISTERED" });
  });

  it("enforces seats, duplicates, past dates and dates from other courses", async () => {
    const c = await publishedCourse();
    const [a, b] = [await signedIn(), await signedIn()];
    expect((await a.call(register, { body: { courseId: c.id, sessionId: c.dated.id, phone: "1" } })).status).toBe(200);
    expect(
      (await a.call(register, { body: { courseId: c.id, sessionId: c.dated.id, phone: "1" } })).json!.message,
    ).toMatch(/already registered/);
    expect(
      (await b.call(register, { body: { courseId: c.id, sessionId: c.dated.id, phone: "1" } })).json!.message,
    ).toMatch(/full/);
    expect((await b.call(register, { body: { courseId: c.id, sessionId: c.open.id, phone: "1" } })).status).toBe(200); // no seat limit
    const other = await publishedCourse();
    expect((await b.call(register, { body: { courseId: c.id, sessionId: other.dated.id, phone: "1" } })).status).toBe(
      400,
    );
    const past = await publishedCourse({ sessions: [{ startsOn: "2020-01-01", seats: 0 }] });
    expect(
      (await b.call(register, { body: { courseId: past.id, sessionId: past.sessions[0]!.id, phone: "1" } })).json!
        .message,
    ).toMatch(/already started/);
    const seats = (await listPublishedCourses(db)).find((x) => x.id === c.id)!.sessions.map((s) => s.taken);
    expect(seats).toEqual([1, 1]);
  });

  it("never sells the last seat twice, even at the same moment", async () => {
    const c = await publishedCourse({ sessions: [{ startsOn: "2099-05-01", seats: 1 }] });
    const people = await Promise.all(Array.from({ length: 6 }, () => signedIn()));
    const results = await Promise.all(
      people.map((p) => p.call(register, { body: { courseId: c.id, sessionId: c.sessions[0]!.id, phone: "1" } })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
  });

  it("records interest without a date, once", async () => {
    const c = await publishedCourse();
    const u = await signedIn();
    const r = await u.call(register, { body: { courseId: c.id } });
    expect(r.json!.status).toBe("INTEREST");
    expect((await u.call(register, { body: { courseId: c.id } })).status).toBe(409);
  });

  it("emails site administrators", async () => {
    const before = fakes.mails.length;
    const c = await publishedCourse({ title: "Research Ethics Workshop" });
    await (
      await signedIn({ name: "Efua" })
    ).call(register, {
      body: { courseId: c.id, sessionId: c.open.id, phone: "+233 20 000 0000", notes: "Vegetarian lunch" },
    });
    await new Promise((r) => setTimeout(r, 200));
    const sent = fakes.mails
      .slice(before)
      .filter((m) => /course registration: Research Ethics Workshop/.test(m.subject));
    const to = sent.map((m) => m.to[0]);
    expect(to).toEqual(expect.arrayContaining(["academy-admin@example.com", "owner-inbox@example.com"]));
    expect(new Set(to).size).toBe(to.length); // nobody gets it twice
    expect(sent[0]!.text).toMatch(/Efua .*registered for Research Ethics Workshop .*Free/);
    expect(sent[0]!.text).toMatch(/Vegetarian lunch/);
  });
});

describe("registration status", () => {
  it("lets people see and cancel only their own", async () => {
    const c = await publishedCourse();
    const [a, b] = [await signedIn(), await signedIn()];
    const ra = await a.call(register, { body: { courseId: c.id, sessionId: c.open.id, phone: "1" } });
    expect((await a.call(mine)).json!.enrollments.map((e: { id: string }) => e.id)).toEqual([ra.json!.id]);
    expect((await b.call(mine)).json!.enrollments).toHaveLength(0);
    expect((await b.call(setStatus(ra.json!.id), { method: "PATCH", body: { status: "CANCELLED" } })).status).toBe(403);
    expect((await a.call(setStatus(ra.json!.id), { method: "PATCH", body: { status: "CONFIRMED" } })).status).toBe(403);
    expect((await a.call(setStatus(ra.json!.id), { method: "PATCH", body: { status: "CANCELLED" } })).status).toBe(200);
    expect((await a.call(register, { body: { courseId: c.id, sessionId: c.open.id, phone: "1" } })).status).toBe(200); // can register again
  });

  it("lets administrators set any status, and frees the seat when cancelled", async () => {
    const c = await publishedCourse();
    const [a, b] = [await signedIn(), await signedIn()];
    const ra = await a.call(register, { body: { courseId: c.id, sessionId: c.dated.id, phone: "1" } });
    expect((await admin.call(setStatus(ra.json!.id), { method: "PATCH", body: { status: "PAID" } })).status).toBe(400);
    expect((await admin.call(setStatus(ra.json!.id), { method: "PATCH", body: { status: "CONFIRMED" } })).status).toBe(
      200,
    );
    expect((await admin.call(setStatus(ra.json!.id), { method: "PATCH", body: { status: "CANCELLED" } })).status).toBe(
      200,
    );
    expect((await b.call(register, { body: { courseId: c.id, sessionId: c.dated.id, phone: "1" } })).status).toBe(200); // seat freed
    const restore = await admin.call(setStatus(ra.json!.id), { method: "PATCH", body: { status: "CONFIRMED" } });
    expect(restore.status).toBe(409); // the date is full again
    expect(await db.auditEvent.count({ where: { entityId: ra.json!.id, action: "enrollment.status" } })).toBe(2);
    const all = (await admin.call(adminList, { path: `/api/admin/registrations?course=${c.id}` })).json!.enrollments;
    expect(all).toHaveLength(2);
    expect((await a.call(adminList)).status).toBe(403);
  });
});

describe("editing and deleting courses with registrations", () => {
  it("protects dates that have registrations", async () => {
    const c = await publishedCourse({
      sessions: [
        { startsOn: "2099-06-01", seats: 3 },
        { startsOn: "2099-07-01", seats: 3 },
      ],
    });
    const [s1, s2] = c.sessions;
    await (await signedIn()).call(register, { body: { courseId: c.id, sessionId: s1!.id, phone: "1" } });
    await (await signedIn()).call(register, { body: { courseId: c.id, sessionId: s1!.id, phone: "1" } });
    const body = (sessions: unknown[]) => course({ title: c.title, status: "PUBLISHED", sessions });
    expect(
      (await admin.call(update(c.id), { method: "PUT", body: body([{ startsOn: "2099-07-01", id: s2!.id }]) })).json!
        .message,
    ).toMatch(/has 2 registrations/);
    expect(
      (
        await admin.call(update(c.id), {
          method: "PUT",
          body: body([{ id: s1!.id, startsOn: "2099-06-01", seats: 1 }]),
        })
      ).json!.message,
    ).toMatch(/already has 2 people/);
    const ok = await admin.call(update(c.id), {
      method: "PUT",
      body: body([
        { id: s1!.id, startsOn: "2099-06-02", seats: 5, fee: "99.50", currency: "GBP" },
        { startsOn: "2099-08-01" },
      ]),
    });
    expect(ok.status).toBe(200);
    const after = await db.courseSession.findMany({ where: { courseId: c.id }, orderBy: { startsOn: "asc" } });
    expect(after.map((s) => [s.id === s1!.id, s.startsOn?.toISOString().slice(0, 10), s.feeMinor])).toEqual([
      [true, "2099-06-02", 9950],
      [false, "2099-08-01", 0],
    ]);
    expect((await db.course.findUniqueOrThrow({ where: { id: c.id } })).slug).toBe(c.slug); // links don't break
  });

  it("deletes only courses without registrations", async () => {
    const c = await publishedCourse();
    await (await signedIn()).call(register, { body: { courseId: c.id } });
    expect((await admin.call(remove(c.id), { method: "DELETE" })).json!.message).toMatch(/Archive it instead/);
    const empty = await admin.call(createCourse, { body: course() });
    expect((await (await signedIn()).call(remove(empty.json!.id), { method: "DELETE" })).status).toBe(403);
    expect((await admin.call(remove(empty.json!.id), { method: "DELETE" })).status).toBe(204);
    expect(await db.course.count({ where: { id: empty.json!.id } })).toBe(0);
  });
});

describe("CSV export", () => {
  it("is for administrators, complete, and safe to open in a spreadsheet", async () => {
    const c = await publishedCourse({ title: "CSV Course" });
    const u = await signedIn({ name: '=HYPERLINK("http://evil")' });
    await u.call(register, {
      body: { courseId: c.id, sessionId: c.dated.id, phone: "+233 24 000 0000", organisation: 'Uni "A", Legon' },
    });
    expect((await u.call(csv, { path: "/api/admin/registrations/csv" })).status).toBe(403);
    const req = new Request(`https://afrimetrica.test/api/admin/registrations/csv?course=${c.id}`, {
      headers: { cookie: `afri_session=${admin.jar.afri_session}`, host: "afrimetrica.test" },
    });
    const res = await A.adminEnrollmentsCsv(req, db);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toMatch(
      /attachment; filename="afrimetrica-registrations-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    const lines = (await res.text()).replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe(
      "Registered on,Name,Email,Phone,Organisation,Course,Start date,End date,Venue,Fee,Status,Notes",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(lines[1]).toContain(`'+233 24 000 0000`);
    expect(lines[1]).toContain(`"Uni ""A"", Legon"`);
    expect(lines[1]).toContain('CSV Course,2099-03-01,2099-03-02,Accra,"GH₵1,200",Registered');
  });
});
