import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./helpers";
import { browser, startFakes } from "./fakes";
import { signedIn } from "./accounts";
import * as E from "@/server/enquiries/handlers";
import * as H from "@/server/auth/handlers";
import { getContactSettings } from "@/server/settings";

let fakes: Awaited<ReturnType<typeof startFakes>>;
const bind = (f: (req: Request, d: typeof db) => Promise<Response>) => (req: Request) => f(req, db);
const send = bind(E.sendEnquiry),
  mine = bind(E.myEnquiries),
  inbox = bind(E.adminListEnquiries),
  csv = bind(E.adminEnquiriesCsv);
const saveContact = bind(E.adminSaveContactSettings),
  verify = bind(H.verifyEmail),
  signup = bind(H.signup);
const setStatus = (id: string) => (req: Request) => E.adminUpdateEnquiry(id)(req, db);

const consultancy = (over: Record<string, unknown> = {}) => ({
  type: "CONSULTANCY",
  name: "Kofi Mensah",
  email: "kofi@ngo.example",
  organisation: "Health NGO",
  service: "Monitoring and evaluation",
  timeline: "1–3 months",
  budget: "Not sure yet",
  message: "We need a baseline survey for a 3-region programme.",
  consent: true,
  ...over,
});

let admin: Awaited<ReturnType<typeof signedIn>>;
let ipN = 0;
const visitor = () => browser(`10.40.${Math.floor(++ipN / 200)}.${ipN % 200}`);

beforeAll(async () => {
  fakes = await startFakes("unused");
  Object.assign(process.env, {
    PUBLIC_URL: "https://afrimetrica.test",
    RESEND_API_KEY: "test-resend-key",
    RESEND_API_URL: `${fakes.base}/emails`,
    ADMIN_EMAILS: "owner-inbox@example.com",
  });
  admin = await signedIn({ siteAdmin: true, email: "enquiry-admin@example.com" });
});
afterAll(async () => {
  await fakes.close();
  await db.$disconnect();
});

describe("sending enquiries", () => {
  it("works without an account and starts as New, whatever is sent", async () => {
    const r = await visitor().call(send, { body: consultancy({ status: "WON", requesterId: admin.user.id }) });
    expect(r.status).toBe(200);
    const e = await db.enquiry.findFirstOrThrow({
      where: { email: "kofi@ngo.example" },
      orderBy: { createdAt: "desc" },
    });
    expect(e).toMatchObject({
      type: "CONSULTANCY",
      status: "NEW",
      requesterId: null,
      service: "Monitoring and evaluation",
      budget: "Not sure yet",
    });
  });

  it("checks every field", async () => {
    const msg = async (over: Record<string, unknown>) =>
      (await visitor().call(send, { body: consultancy(over) })).json!.message as string;
    expect(await msg({ type: "SPAM" })).toMatch(/Unknown enquiry type/);
    expect(await msg({ name: " ", email: "nope", message: "hi", consent: false })).toBe(
      "Enter your name. Enter a valid email address. Tell us a little about what you need. Tick the box so we can contact you.",
    );
    expect(await msg({ service: "Free money" })).toMatch(/service from the list/);
    expect(await msg({ budget: "A million" })).toMatch(/budget from the list/);
  });

  it("ignores options that don't belong to the form, and keeps subjects for general messages only", async () => {
    await visitor().call(send, {
      body: {
        type: "TRAINING",
        name: "Ama",
        email: "ama-t@example.com",
        message: "In-house workshop please",
        consent: true,
        budget: "A million",
        subject: "x",
      },
    });
    const t = await db.enquiry.findFirstOrThrow({ where: { email: "ama-t@example.com" } });
    expect([t.budget, t.subject]).toEqual(["", ""]);
    await visitor().call(send, {
      body: {
        type: "CONTACT",
        name: "Ama",
        email: "ama-c@example.com",
        subject: "Invoices",
        message: "Where do I send it?",
        consent: true,
      },
    });
    expect((await db.enquiry.findFirstOrThrow({ where: { email: "ama-c@example.com" } })).subject).toBe("Invoices");
  });

  it("quietly drops bot submissions caught by the hidden field", async () => {
    const before = await db.enquiry.count();
    const r = await visitor().call(send, {
      body: consultancy({ email: "bot@example.com", website: "http://spam.example" }),
    });
    expect(r.status).toBe(200);
    expect(await db.enquiry.count()).toBe(before);
  });

  it("is rate limited per connection", async () => {
    const same = browser("10.41.0.1");
    const codes = [];
    for (let i = 0; i < 12; i++)
      codes.push((await same.call(send, { body: consultancy({ email: `flood${i}@example.com` }) })).status);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
  });

  it("emails site administrators, each once", async () => {
    const before = fakes.mails.length;
    await visitor().call(send, {
      body: consultancy({
        name: "Akua Boateng",
        email: "akua@example.com",
        message: "Evaluation of a <b>school feeding</b> programme",
      }),
    });
    await new Promise((r) => setTimeout(r, 200));
    const sent = fakes.mails.slice(before).filter((m) => /consultancy enquiry from Akua Boateng/.test(m.subject));
    const to = sent.map((m) => m.to[0]);
    expect(to).toEqual(expect.arrayContaining(["enquiry-admin@example.com", "owner-inbox@example.com"]));
    expect(new Set(to).size).toBe(to.length);
    expect(sent[0]!.text).toMatch(/Timeline: 1–3 months · Budget: Not sure yet/);
    expect(sent[0]!.html).toContain("&lt;b&gt;school feeding&lt;/b&gt;");
  });
});

describe("who sees an enquiry", () => {
  it("links it to the sender's account only if it's their own confirmed email", async () => {
    const confirmed = await signedIn({ email: "efua-enquirer@example.com" });
    await confirmed.call(send, { body: consultancy({ email: "efua-enquirer@example.com" }) });
    await confirmed.call(send, { body: consultancy({ email: "someone-else@example.com" }) });
    const list = (await confirmed.call(mine)).json!.enquiries;
    expect(list).toHaveLength(1);
    expect(Object.keys(list[0]).sort()).toEqual(["createdAt", "id", "service", "status", "subject", "type"]); // no message or contact details echoed back
    const unconfirmed = await signedIn({ email: "yaw-u@example.com", verified: false });
    await unconfirmed.call(send, { body: consultancy({ email: "yaw-u@example.com" }) });
    expect((await unconfirmed.call(mine)).json!.enquiries).toHaveLength(0);
  });

  it("joins earlier enquiries to the account once the email is confirmed", async () => {
    await visitor().call(send, { body: consultancy({ email: "later@example.com" }) });
    const A = visitor();
    const before = fakes.mails.length;
    await A.call(signup, { body: { email: "later@example.com", password: "a long password" } });
    expect((await A.call(mine)).json!.enquiries).toHaveLength(0); // not yet confirmed
    let mail;
    for (let i = 0; i < 40 && !mail; i++) {
      mail = fakes.mails.slice(before).find((m) => m.to[0] === "later@example.com");
      if (!mail) await new Promise((r) => setTimeout(r, 25));
    }
    const token = new URL(mail!.text.match(/https:\/\/\S+/)![0]).searchParams.get("token");
    await visitor().call(verify, { body: { token } });
    expect((await A.call(mine)).json!.enquiries).toHaveLength(1);
  });

  it("keeps the inbox for site administrators", async () => {
    expect((await visitor().call(inbox)).status).toBe(401);
    expect((await (await signedIn()).call(inbox)).status).toBe(403);
    const all = (await admin.call(inbox)).json!.enquiries;
    expect(all.length).toBeGreaterThan(5);
    const training = (await admin.call(inbox, { path: "/api/admin/enquiries?type=TRAINING" })).json!.enquiries;
    expect(training.every((e: { type: string }) => e.type === "TRAINING")).toBe(true);
    expect((await admin.call(inbox, { path: "/api/admin/enquiries?type=NONSENSE" })).json!.enquiries.length).toBe(
      all.length,
    );
  });
});

describe("working the inbox", () => {
  it("changes status with an audit entry", async () => {
    const e = await db.enquiry.findFirstOrThrow({ where: { email: "akua@example.com" } });
    expect((await (await signedIn()).call(setStatus(e.id), { method: "PATCH", body: { status: "WON" } })).status).toBe(
      403,
    );
    expect((await admin.call(setStatus(e.id), { method: "PATCH", body: { status: "PAID" } })).status).toBe(400);
    expect((await admin.call(setStatus("nope"), { method: "PATCH", body: { status: "WON" } })).status).toBe(404);
    expect((await admin.call(setStatus(e.id), { method: "PATCH", body: { status: "CONTACTED" } })).status).toBe(200);
    expect((await db.enquiry.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("CONTACTED");
    const log = await db.auditEvent.findFirstOrThrow({ where: { action: "enquiry.status", entityId: e.id } });
    expect(log).toMatchObject({ actorId: admin.user.id, metadata: { from: "NEW", to: "CONTACTED" } });
  });

  it("exports a safe CSV", async () => {
    await visitor().call(send, {
      body: consultancy({ name: "=cmd|' /C calc'!A0", email: "csv@example.com", message: 'Line one\nLine "two"' }),
    });
    const req = new Request("https://afrimetrica.test/api/admin/enquiries/csv?type=CONSULTANCY", {
      headers: { cookie: `afri_session=${admin.jar.afri_session}`, host: "afrimetrica.test" },
    });
    const res = await E.adminEnquiriesCsv(req, db);
    expect(res.headers.get("content-disposition")).toMatch(/afrimetrica-enquiries-\d{4}-\d{2}-\d{2}\.csv/);
    const body = (await res.text()).replace(/^﻿/, "");
    expect(body.split("\r\n")[0]).toBe(
      "Received on,Type,Name,Email,Phone,Organisation,Service,Timeline,Budget,Subject,Message,Status",
    );
    expect(body).toContain(`"'=cmd|' /C calc'!A0"`.replace(/^"|"$/g, ""));
    expect(body).toContain(`"Line one\nLine ""two"""`);
    expect((await (await signedIn()).call(csv)).status).toBe(403);
    expect(await db.auditEvent.count({ where: { action: "enquiry.export" } })).toBeGreaterThan(0);
  });
});

describe("contact details", () => {
  it("are set by site administrators and shown on the Contact page", async () => {
    expect(
      (await (await signedIn()).call(saveContact, { method: "PUT", body: { email: "x@example.com" } })).status,
    ).toBe(403);
    const bad = async (body: Record<string, string>) =>
      (await admin.call(saveContact, { method: "PUT", body })).json!.message as string;
    expect(await bad({ email: "nope" })).toMatch(/email/);
    expect(await bad({ phone: "call me" })).toMatch(/phone/);
    expect(await bad({ whatsapp: "123" })).toMatch(/WhatsApp/);
    expect(await bad({ linkedin: "javascript:alert(1)" })).toMatch(/LinkedIn/);
    expect(await bad({ linkedin: "https://evil.example/linkedin.com" })).toMatch(/LinkedIn/);
    const ok = await admin.call(saveContact, {
      method: "PUT",
      body: {
        email: "Info@Afrimetrica.example",
        phone: "+233 30 000 0000",
        whatsapp: "+233 20 000 0000",
        address: "Accra, Ghana",
        hours: "Mon–Fri",
        linkedin: "https://www.linkedin.com/company/afrimetrica",
      },
    });
    expect(ok.status).toBe(200);
    expect(await getContactSettings()).toEqual({
      email: "info@afrimetrica.example",
      phone: "+233 30 000 0000",
      whatsapp: "+233 20 000 0000",
      address: "Accra, Ghana",
      hours: "Mon–Fri",
      linkedin: "https://www.linkedin.com/company/afrimetrica",
    });
    await admin.call(saveContact, { method: "PUT", body: { email: "info@afrimetrica.example" } });
    expect(await getContactSettings()).toEqual({ email: "info@afrimetrica.example" }); // blank fields are hidden
    const log = await db.auditEvent.findMany({ where: { action: "settings.contact" }, orderBy: { createdAt: "asc" } });
    expect(log).toHaveLength(2);
    expect(log[1]!.metadata).toMatchObject({ before: { phone: "+233 30 000 0000" }, after: { phone: "" } });
  });
});
