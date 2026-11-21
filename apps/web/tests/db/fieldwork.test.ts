import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./helpers";
import { browser, startFakes } from "./fakes";
import { signedIn } from "./accounts";
import * as F from "@/server/fieldwork/handlers";
import { f2fQuote, parseInputs } from "@/lib/fieldwork";

let fakes: Awaited<ReturnType<typeof startFakes>>;
const send = (req: Request) => F.requestFieldwork(req, db);
const setStatus = (id: string) => (req: Request) => F.adminUpdateFieldwork(id)(req, db);
let ip = 0;
const visitor = () => browser(`10.60.${Math.floor(++ip / 200)}.${ip % 200}`);
const inputs = {
  method: "questionnaire",
  n: 300,
  country: "Ghana",
  setting: "urban",
  audience: "general",
  capture: "tablet",
  report: "summary",
  urgency: "standard",
  minutes: "",
  languages: 0,
};
const survey = {
  title: "Clinic survey",
  source: "clinic.docx",
  questions: [
    { type: "SINGLE", text: "How often do you visit?", options: ["Weekly", "Monthly"] },
    { type: "TEXT", text: "Why?" },
  ],
};
const body = (over: Record<string, unknown> = {}) => ({
  inputs,
  survey,
  contact: { name: "Ama Owusu", email: "ama@clinic.example", consent: true, organisation: "Clinic" },
  ...over,
});

beforeAll(async () => {
  fakes = await startFakes("unused");
  Object.assign(process.env, {
    PUBLIC_URL: "https://afrimetrica.test",
    RESEND_API_KEY: "test-resend-key",
    RESEND_API_URL: `${fakes.base}/emails`,
    ADMIN_EMAILS: "owner-inbox@example.com",
  });
});
afterAll(async () => {
  await fakes.close();
  await db.$disconnect();
});

describe("Paper Survey requests", () => {
  it("work without an account and record the server's own price, ignoring any price sent", async () => {
    const r = await visitor().call(send, { body: body({ quote: { total: 1 }, total: 1 }) });
    expect(r.status).toBe(200);
    expect(r.json!.ref).toMatch(/^Q-[0-9A-F]{6}$/);
    const row = await db.fieldworkRequest.findUniqueOrThrow({ where: { ref: r.json!.ref } });
    const expected = f2fQuote(parseInputs(inputs)!, ["SINGLE", "TEXT"]);
    expect(row.quoteTotalUsd).toBe(Math.round(expected.total));
    expect((row.quote as { total: number }).total).toBe(expected.total);
    expect(row).toMatchObject({ status: "NEW", requesterId: null, name: "Ama Owusu", organisation: "Clinic" });
    expect((row.surveySnapshot as { questions: unknown[] }).questions).toHaveLength(2);
  });

  it("checks details and refuses tampered options", async () => {
    const msg = async (over: Record<string, unknown>) =>
      (await visitor().call(send, { body: body(over) })).json!.message as string;
    expect(await msg({ contact: { name: "", email: "x", consent: false } })).toBe(
      "Enter your name. Enter a valid email address. Tick the box so we can contact you.",
    );
    expect(await msg({ inputs: { ...inputs, method: "telepathy" } })).toMatch(/weren't recognised/);
    expect(await msg({ survey: null })).toMatch(/Upload a questionnaire or enter the interview length/);
    expect(
      (await visitor().call(send, { body: body({ survey: null, inputs: { ...inputs, minutes: 20 } }) })).status,
    ).toBe(200);
  });

  it("emails administrators and drops bot submissions", async () => {
    const before = fakes.mails.length,
      count = await db.fieldworkRequest.count();
    await visitor().call(send, { body: body({ website: "spam" }) });
    expect(await db.fieldworkRequest.count()).toBe(count);
    await visitor().call(send, {
      body: body({ contact: { name: "Kojo Mensah", email: "kojo@example.com", consent: true } }),
    });
    await new Promise((r) => setTimeout(r, 200));
    const mail = fakes.mails.slice(before).find((m) => /Paper Survey request from Kojo Mensah/.test(m.subject));
    expect(mail?.text).toMatch(/Quote Q-[0-9A-F]{6}: US\$[\d,]+ for 300 interviews/);
  });

  it("joins the sender's account once their email is confirmed", async () => {
    const u = await signedIn({ email: `fw-${Date.now()}@example.com` });
    await u.call(send, { body: body({ contact: { name: "Me", email: u.user.email, consent: true } }) });
    expect(await db.fieldworkRequest.count({ where: { requesterId: u.user.id } })).toBe(1);
  });

  it("is managed by site administrators only, with an audit trail", async () => {
    const r = await visitor().call(send, { body: body() });
    const row = await db.fieldworkRequest.findUniqueOrThrow({ where: { ref: r.json!.ref } });
    const admin = await signedIn({ siteAdmin: true });
    expect(
      (await (await signedIn()).call(setStatus(row.id), { method: "PATCH", body: { status: "WON" } })).status,
    ).toBe(403);
    expect((await admin.call(setStatus(row.id), { method: "PATCH", body: { status: "PAID" } })).status).toBe(400);
    expect((await admin.call(setStatus(row.id), { method: "PATCH", body: { status: "QUOTED" } })).status).toBe(200);
    expect(await db.auditEvent.count({ where: { action: "fieldwork.status", entityId: row.id } })).toBe(1);
    const csv = await F.adminFieldworkCsv(
      new Request("https://afrimetrica.test/api/admin/fieldwork/csv", {
        headers: { cookie: `afri_session=${admin.jar.afri_session}`, host: "afrimetrica.test" },
      }),
      db,
    );
    expect(await csv.text()).toContain(`${row.ref},Ama Owusu`);
  });
});
