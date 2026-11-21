import { afterAll, describe, expect, it } from "vitest";
import { db, failure, newUser, uniq } from "./helpers";
import { seed, AFRIMETRICA_ORG } from "../../prisma/seed-lib";

afterAll(() => db.$disconnect());

async function courseWithSession(seats = 0) {
  return db.course.create({
    data: {
      slug: uniq("course"),
      title: "Questionnaire Design",
      status: "PUBLISHED",
      outcomes: ["Write clear questions"],
      sessions: { create: [{ startsOn: new Date("2099-03-01"), seats, feeMinor: 120000, currency: "GHS" }] },
    },
    include: { sessions: true },
  });
}

async function surveyWithDraft(ownerId: string) {
  return db.survey.create({
    data: {
      ownerId,
      versions: {
        create: {
          number: 1,
          title: "Course evaluation",
          questions: {
            create: [
              {
                position: 0,
                type: "LIKERT",
                text: "The course was useful.",
                options: ["Disagree", "Neutral", "Agree"],
              },
              { position: 1, type: "TEXT", text: "Any comments?", options: [], required: false },
            ],
          },
        },
      },
    },
    include: { versions: { include: { questions: true } } },
  });
}

describe("migrations", () => {
  it("create every table", async () => {
    const rows = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    const names = rows.map((r) => r.table_name);
    for (const t of [
      "User",
      "Organisation",
      "Membership",
      "ParticipantProfile",
      "Course",
      "CourseSession",
      "Enrollment",
      "Survey",
      "SurveyVersion",
      "Question",
      "ConsentRecord",
      "Response",
      "Answer",
      "InsightAction",
      "Enquiry",
      "FieldworkRequest",
      "SiteSetting",
      "AuditEvent",
    ])
      expect(names).toContain(t);
  });
});

describe("people", () => {
  it("stores emails in lower case only", async () => {
    expect(await failure(db.user.create({ data: { email: "Mixed@Example.com" } }))).toMatch(/User_email_lowercase/);
  });
  it("refuses duplicate emails", async () => {
    const u = await newUser();
    expect(await failure(db.user.create({ data: { email: u.email } }))).toMatch(/Unique constraint/i);
  });
  it("allows one membership per person per organisation, removed with the person", async () => {
    const u = await newUser();
    const org = await db.organisation.create({ data: { slug: uniq("org"), name: "Test org" } });
    await db.membership.create({ data: { userId: u.id, organisationId: org.id, role: "ANALYST" } });
    expect(await failure(db.membership.create({ data: { userId: u.id, organisationId: org.id } }))).toMatch(/Unique/i);
    await db.user.delete({ where: { id: u.id } });
    expect(await db.membership.count({ where: { organisationId: org.id } })).toBe(0);
  });
  it("only accepts adult participant profiles", async () => {
    const u = await newUser();
    const data = { userId: u.id, age: 16, gender: "Woman", country: "Ghana", occupation: "Student" };
    expect(await failure(db.participantProfile.create({ data }))).toMatch(/ParticipantProfile_adult/);
  });
});

describe("Academy", () => {
  it("rejects negative seats or fees and dates that end before they start", async () => {
    const c = await courseWithSession();
    expect(await failure(db.courseSession.create({ data: { courseId: c.id, seats: -1 } }))).toMatch(
      /seats_nonnegative/,
    );
    expect(await failure(db.courseSession.create({ data: { courseId: c.id, feeMinor: -5 } }))).toMatch(
      /fee_nonnegative/,
    );
    expect(
      await failure(
        db.courseSession.create({
          data: { courseId: c.id, startsOn: new Date("2099-03-02"), endsOn: new Date("2099-03-01") },
        }),
      ),
    ).toMatch(/dates_ordered/);
  });

  it("allows one active registration per person, course and date", async () => {
    const [u, c] = [await newUser(), await courseWithSession()];
    const s = c.sessions[0]!;
    const base = { userId: u.id, courseId: c.id, name: "Yaw", email: u.email };
    const first = await db.enrollment.create({ data: { ...base, sessionId: s.id } });
    expect(await failure(db.enrollment.create({ data: { ...base, sessionId: s.id } }))).toMatch(/Unique|one_active/i);
    await db.enrollment.update({ where: { id: first.id }, data: { status: "CANCELLED" } });
    expect(await failure(db.enrollment.create({ data: { ...base, sessionId: s.id } }))).toBe("");
  });

  it("treats register-interest (no date) as one slot too", async () => {
    const [u, c] = [await newUser(), await courseWithSession()];
    const base = { userId: u.id, courseId: c.id, name: "Ama", email: u.email, status: "INTEREST" as const };
    await db.enrollment.create({ data: base });
    expect(await failure(db.enrollment.create({ data: base }))).toMatch(/Unique|one_active/i);
  });

  it("refuses a date that belongs to another course", async () => {
    const [u, c1, c2] = [await newUser(), await courseWithSession(), await courseWithSession()];
    const data = { userId: u.id, courseId: c1.id, sessionId: c2.sessions[0]!.id, name: "Kofi", email: u.email };
    expect(await failure(db.enrollment.create({ data }))).toMatch(/does not belong to course/);
  });

  it("won't delete a course that still has registrations", async () => {
    const [u, c] = [await newUser(), await courseWithSession()];
    await db.enrollment.create({ data: { userId: u.id, courseId: c.id, name: "Efua", email: u.email } });
    expect(await failure(db.course.delete({ where: { id: c.id } }))).not.toBe("");
  });
});

describe("survey versions", () => {
  it("can edit a draft version freely", async () => {
    const s = await surveyWithDraft((await newUser()).id);
    const v = s.versions[0]!;
    await db.surveyVersion.update({ where: { id: v.id }, data: { title: "Course evaluation (v1)" } });
    await db.question.update({ where: { id: v.questions[0]!.id }, data: { text: "The course was very useful." } });
    await db.question.create({
      data: { versionId: v.id, position: 2, type: "NUMBER", text: "Hours studied", options: [] },
    });
    expect(await db.question.count({ where: { versionId: v.id } })).toBe(3);
  });

  it("freezes a version and its questions once published", async () => {
    const s = await surveyWithDraft((await newUser()).id);
    const v = s.versions[0]!;
    await db.surveyVersion.update({ where: { id: v.id }, data: { publishedAt: new Date() } });
    const frozen = /published/;
    expect(await failure(db.surveyVersion.update({ where: { id: v.id }, data: { title: "Changed" } }))).toMatch(frozen);
    expect(await failure(db.surveyVersion.update({ where: { id: v.id }, data: { publishedAt: null } }))).toMatch(
      frozen,
    );
    expect(await failure(db.question.update({ where: { id: v.questions[0]!.id }, data: { text: "Changed" } }))).toMatch(
      frozen,
    );
    expect(await failure(db.question.delete({ where: { id: v.questions[1]!.id } }))).toMatch(frozen);
    expect(
      await failure(
        db.question.create({ data: { versionId: v.id, position: 9, type: "TEXT", text: "New", options: [] } }),
      ),
    ).toMatch(frozen);
    expect(await failure(db.surveyVersion.delete({ where: { id: v.id } }))).toMatch(frozen);
    expect(await failure(db.survey.delete({ where: { id: s.id } }))).toMatch(frozen);
  });

  it("lets owners publish a new version instead", async () => {
    const s = await surveyWithDraft((await newUser()).id);
    await db.surveyVersion.update({ where: { id: s.versions[0]!.id }, data: { publishedAt: new Date() } });
    const v2 = await db.surveyVersion.create({ data: { surveyId: s.id, number: 2, title: "Course evaluation v2" } });
    expect(v2.number).toBe(2);
    expect(await failure(db.surveyVersion.create({ data: { surveyId: s.id, number: 2, title: "dup" } }))).toMatch(
      /Unique/i,
    );
  });

  it("deletes a never-published survey with its draft versions", async () => {
    const s = await surveyWithDraft((await newUser()).id);
    await db.survey.delete({ where: { id: s.id } });
    expect(await db.surveyVersion.count({ where: { surveyId: s.id } })).toBe(0);
  });
});

describe("responses and answers", () => {
  it("must be given to a published version, once per person, with answers from that version", async () => {
    const owner = await newUser("owner");
    const p = await newUser("participant");
    const s = await surveyWithDraft(owner.id);
    const v = s.versions[0]!;
    const base = { surveyId: s.id, surveyVersionId: v.id, participantId: p.id };
    expect(await failure(db.response.create({ data: base }))).toMatch(/published version/);

    await db.surveyVersion.update({ where: { id: v.id }, data: { publishedAt: new Date() } });
    const consent = await db.consentRecord.create({
      data: { surveyVersionId: v.id, participantId: p.id, statement: "I agree to take part." },
    });
    const r = await db.response.create({
      data: {
        ...base,
        consentRecordId: consent.id,
        answers: { create: [{ questionId: v.questions[0]!.id, value: "Agree" }] },
      },
    });
    expect(r.status).toBe("APPROVED");
    expect(await failure(db.response.create({ data: base }))).toMatch(/Unique/i);

    const other = await surveyWithDraft(owner.id);
    const foreignQ = other.versions[0]!.questions[0]!.id;
    expect(await failure(db.answer.create({ data: { responseId: r.id, questionId: foreignQ, value: "x" } }))).toMatch(
      /not part of the response/,
    );
    expect(
      await failure(db.answer.create({ data: { responseId: r.id, questionId: v.questions[0]!.id, value: 1 } })),
    ).toMatch(/Unique/i);
  });

  it("keeps surveys whose owner still has them (accounts can't be deleted from under a survey)", async () => {
    const owner = await newUser("owner");
    await surveyWithDraft(owner.id);
    expect(await failure(db.user.delete({ where: { id: owner.id } }))).not.toBe("");
  });
});

describe("audit log", () => {
  it("is append-only", async () => {
    const e = await db.auditEvent.create({ data: { action: "course.publish", entityType: "Course", entityId: "c1" } });
    expect(await failure(db.auditEvent.update({ where: { id: e.id }, data: { action: "x" } }))).toMatch(
      /append|cannot/,
    );
    expect(await failure(db.auditEvent.delete({ where: { id: e.id } }))).toMatch(/cannot/);
    expect(await failure(db.$executeRawUnsafe('TRUNCATE "AuditEvent"'))).toMatch(/cannot/);
    expect(await db.auditEvent.count({ where: { id: e.id } })).toBe(1);
  });
  it("outlives the person who acted", async () => {
    const u = await newUser();
    await db.auditEvent.create({
      data: { actorId: u.id, action: "settings.update", entityType: "SiteSetting", entityId: "contact" },
    });
    await db.user.delete({ where: { id: u.id } });
    expect(await db.auditEvent.count({ where: { actorId: u.id } })).toBe(1);
  });
});

describe("seed", () => {
  it("creates the Afrimetrica organisation and an owner, and is safe to run twice", async () => {
    const email = `${uniq("Owner")}@Example.com`;
    const a = await seed(db, { ownerEmail: email });
    const b = await seed(db, { ownerEmail: email });
    expect(a).toEqual(b);
    expect(await db.organisation.count({ where: { slug: AFRIMETRICA_ORG.slug } })).toBe(1);
    const m = await db.membership.findFirstOrThrow({ where: { userId: a.ownerId!, organisationId: a.organisationId } });
    expect(m.role).toBe("OWNER");
    expect((await db.user.findUniqueOrThrow({ where: { id: a.ownerId! } })).email).toBe(email.toLowerCase());
  });
  it("creates no sample courses, surveys or people when no owner is given", async () => {
    const before = await Promise.all([db.course.count(), db.survey.count(), db.user.count()]);
    await seed(db);
    expect(await Promise.all([db.course.count(), db.survey.count(), db.user.count()])).toEqual(before);
  });
  it("rejects an invalid owner email", async () => {
    expect(await failure(seed(db, { ownerEmail: "not-an-email" }))).toMatch(/not a valid email/);
  });
});
