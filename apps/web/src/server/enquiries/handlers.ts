import "server-only";
import type { EnquiryStatus, Prisma } from "@/generated/prisma/client";
import { csvRow, isoDay } from "@/lib/academy";
import {
  ASKS_BUDGET,
  BUDGETS,
  ENQUIRY_STATUS_LABEL,
  ENQUIRY_STATUSES,
  ENQUIRY_TYPE_LABEL,
  ENQUIRY_TYPES,
  SERVICES,
  TIMELINES,
  type EnquiryTypeCode,
} from "@/lib/enquiries";
import { adminRecipients } from "../academy/service";
import { audit } from "../audit";
import { requireSiteAdmin, requireUser } from "../auth/guards";
import { handle } from "../auth/handlers";
import { currentUser } from "../auth/session";
import { authConfig, emailEnabled } from "../config";
import { brandEmail, sendInBackground } from "../email";
import { cleanEmail, clientIp, fail, json, readJson, trustedBase, validEmail } from "../http";
import { tooMany } from "../rate-limit";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = (v: unknown, list: readonly string[], what: string) => {
  const s = text(v, 200);
  if (s && !list.includes(s)) throw Object.assign(new Error(`Choose a ${what} from the list.`), { bad: true });
  return s;
};

/** Public: anyone can send an enquiry, with or without an account. */
export const sendEnquiry = handle(async (req, db) => {
  const b = await readJson(req, 20_000);
  // Bots fill every field, including this one, which people never see. Pretend it worked and store nothing.
  if (text(b.website, 200)) return json(200, { ok: true });
  const type = b.type as EnquiryTypeCode;
  if (!ENQUIRY_TYPES.includes(type)) return fail(400, "invalid_argument", "Unknown enquiry type.");
  const name = text(b.name, 80),
    email = cleanEmail(b.email),
    message = text(b.message, 4000);
  const errors = [
    !name && "Enter your name.",
    !validEmail(email) && "Enter a valid email address.",
    message.length < 5 && "Tell us a little about what you need.",
    b.consent !== true && "Tick the box so we can contact you.",
  ].filter(Boolean);
  if (errors.length) return fail(400, "invalid_argument", errors.join(" "));
  let service = "",
    timeline = "",
    budget = "";
  try {
    service = oneOf(b.service, SERVICES[type], "service");
    if (ASKS_BUDGET[type]) {
      timeline = oneOf(b.timeline, TIMELINES, "timeline");
      budget = oneOf(b.budget, BUDGETS, "budget");
    }
  } catch (e) {
    return fail(400, "invalid_argument", (e as Error).message);
  }
  if (await tooMany(db, `enquiry-ip|${clientIp(req)}`, 10, 3600e3))
    return fail(
      429,
      "rate_limited",
      "Too many enquiries from this connection. Please try again later or email us directly.",
    );

  const user = await currentUser(db, req);
  const enquiry = await db.enquiry.create({
    data: {
      type,
      name,
      email,
      message,
      service,
      timeline,
      budget,
      phone: text(b.phone, 40),
      organisation: text(b.organisation, 120),
      subject: type === "CONTACT" ? text(b.subject, 160) : "",
      // Linked to the account only if it's the sender's own confirmed address.
      requesterId: user && user.email === email && user.emailVerifiedAt ? user.id : null,
    },
  });
  if (emailEnabled()) {
    const to = await adminRecipients(db, authConfig().adminEmails);
    const body = brandEmail({
      paragraphs: [
        `${name} (${email}${enquiry.phone ? `, ${enquiry.phone}` : ""}${enquiry.organisation ? `, ${enquiry.organisation}` : ""}) sent a ${ENQUIRY_TYPE_LABEL[type].toLowerCase()} enquiry${service ? ` about ${service}` : ""}.`,
        ...(timeline || budget
          ? [[timeline && `Timeline: ${timeline}`, budget && `Budget: ${budget}`].filter(Boolean).join(" · ")]
          : []),
        ...(enquiry.subject ? [`Subject: ${enquiry.subject}`] : []),
        message.slice(0, 1500),
      ],
      button: "Open the enquiries inbox",
      link: `${trustedBase(req) ?? ""}/admin/enquiries`,
      footer:
        "You're receiving this because you're an Afrimetrica site administrator. Reply to the sender directly by email.",
    });
    for (const addr of to)
      sendInBackground(addr, `New ${ENQUIRY_TYPE_LABEL[type].toLowerCase()} enquiry from ${name}`, body);
  }
  return json(200, { ok: true });
});

export const myEnquiries = handle(async (req, db) => {
  const { user, error } = await requireUser(db, req);
  if (error) return error;
  const rows = await db.enquiry.findMany({
    where: { requesterId: user.id },
    select: { id: true, type: true, status: true, service: true, subject: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return json(200, { enquiries: rows });
});

function adminFilter(req: Request): Prisma.EnquiryWhereInput {
  const q = new URL(req.url).searchParams;
  const type = q.get("type") as EnquiryTypeCode | null,
    status = q.get("status") as EnquiryStatus | null;
  return {
    type: type && ENQUIRY_TYPES.includes(type) ? type : undefined,
    status: status && ENQUIRY_STATUSES.includes(status) ? status : undefined,
  };
}

export const adminListEnquiries = handle(async (req, db) => {
  const { error } = await requireSiteAdmin(db, req);
  if (error) return error;
  return json(200, {
    enquiries: await db.enquiry.findMany({ where: adminFilter(req), orderBy: { createdAt: "desc" }, take: 1000 }),
  });
});

export const adminUpdateEnquiry = (id: string) =>
  handle(async (req, db) => {
    const { user, error } = await requireSiteAdmin(db, req);
    if (error) return error;
    const status = (await readJson(req)).status as EnquiryStatus;
    if (!ENQUIRY_STATUSES.includes(status)) return fail(400, "invalid_argument", "Unknown status.");
    const e = await db.enquiry.findUnique({ where: { id } });
    if (!e) return fail(404, "not_found", "Enquiry not found.");
    await db.$transaction([
      db.enquiry.update({ where: { id }, data: { status } }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: "enquiry.status",
          entityType: "Enquiry",
          entityId: id,
          metadata: { from: e.status, to: status },
        },
      }),
    ]);
    return json(200, { id, status });
  });

export const adminEnquiriesCsv = handle(async (req, db) => {
  const { user, error } = await requireSiteAdmin(db, req);
  if (error) return error;
  const rows = await db.enquiry.findMany({ where: adminFilter(req), orderBy: { createdAt: "asc" } });
  const lines = [
    csvRow([
      "Received on",
      "Type",
      "Name",
      "Email",
      "Phone",
      "Organisation",
      "Service",
      "Timeline",
      "Budget",
      "Subject",
      "Message",
      "Status",
    ]),
    ...rows.map((e) =>
      csvRow([
        isoDay(e.createdAt),
        ENQUIRY_TYPE_LABEL[e.type],
        e.name,
        e.email,
        e.phone,
        e.organisation,
        e.service,
        e.timeline,
        e.budget,
        e.subject,
        e.message,
        ENQUIRY_STATUS_LABEL[e.status],
      ]),
    ),
  ];
  await audit(db, {
    actorId: user.id,
    action: "enquiry.export",
    entityType: "Enquiry",
    entityId: "all",
    metadata: { rows: rows.length },
    ip: clientIp(req),
  });
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afrimetrica-enquiries-${isoDay(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

// ---------- site settings: contact details ----------

export const CONTACT_FIELDS = ["email", "phone", "whatsapp", "address", "hours", "linkedin"] as const;

export const adminSaveContactSettings = handle(async (req, db) => {
  const { user, error } = await requireSiteAdmin(db, req);
  if (error) return error;
  const b = await readJson(req);
  const v = {
    email: cleanEmail(b.email),
    phone: text(b.phone, 40),
    whatsapp: text(b.whatsapp, 40),
    address: text(b.address, 400),
    hours: text(b.hours, 120),
    linkedin: text(b.linkedin, 300),
  };
  if (v.email && !validEmail(v.email)) return fail(400, "invalid_argument", "That email address doesn't look right.");
  if (v.phone && !/^[+\d][\d\s()-]{5,}$/.test(v.phone))
    return fail(400, "invalid_argument", "Enter the phone number with digits, like +233 30 000 0000.");
  if (v.whatsapp && v.whatsapp.replace(/\D/g, "").length < 8)
    return fail(400, "invalid_argument", "Enter the WhatsApp number with its country code, like +233 20 000 0000.");
  if (v.linkedin) {
    let ok = false;
    try {
      const u = new URL(v.linkedin);
      ok = u.protocol === "https:" && /(^|\.)linkedin\.com$/.test(u.hostname);
    } catch {}
    if (!ok) return fail(400, "invalid_argument", "The LinkedIn link must start with https:// and be on linkedin.com.");
  }
  const before = (await db.siteSetting.findUnique({ where: { key: "contact" } }))?.value ?? {};
  await db.$transaction([
    db.siteSetting.upsert({
      where: { key: "contact" },
      update: { value: v, updatedById: user.id },
      create: { key: "contact", value: v, updatedById: user.id },
    }),
    db.auditEvent.create({
      data: {
        actorId: user.id,
        action: "settings.contact",
        entityType: "SiteSetting",
        entityId: "contact",
        metadata: { before, after: v },
      },
    }),
  ]);
  return json(200, { ok: true, contact: v });
});
