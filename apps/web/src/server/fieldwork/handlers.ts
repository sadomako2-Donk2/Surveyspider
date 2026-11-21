import "server-only";
import type { FieldworkStatus, Prisma } from "@/generated/prisma/client";
import { randomBytes } from "node:crypto";
import { csvRow, isoDay } from "@/lib/academy";
import { F2F_METHODS, f2fQuote, f2fReady, parseInputs } from "@/lib/fieldwork";
import { QUESTION_TYPES, type QuestionTypeCode } from "@/lib/surveys";
import { adminRecipients } from "../academy/service";
import { audit } from "../audit";
import { requireSiteAdmin } from "../auth/guards";
import { handle } from "../auth/handlers";
import { currentUser } from "../auth/session";
import { authConfig, emailEnabled } from "../config";
import { brandEmail, sendInBackground } from "../email";
import { cleanEmail, clientIp, fail, json, readJson, trustedBase, validEmail } from "../http";
import { tooMany } from "../rate-limit";

export const FIELDWORK_STATUSES: FieldworkStatus[] = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];
export const FIELDWORK_LABEL: Record<FieldworkStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Final quote sent",
  WON: "Won",
  LOST: "Lost",
};
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const usd0 = (x: number) => `US$${Math.round(x).toLocaleString("en-US")}`;

/** The survey being priced, as sent by the browser: kept for staff, and its question types drive the price. */
function parseSurvey(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const list = (Array.isArray(s.questions) ? s.questions : []).slice(0, 300).map((q) => {
    const x = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
    const type = String(x.type ?? "").toUpperCase() as QuestionTypeCode;
    return {
      type: QUESTION_TYPES.includes(type) ? type : ("TEXT" as QuestionTypeCode),
      text: text(x.text, 300),
      options: Array.isArray(x.options) ? x.options.slice(0, 20).map((o) => text(o, 120)) : [],
    };
  });
  if (!list.length) return null;
  return { title: text(s.title, 200), source: text(s.source, 120), questions: list };
}

/** Anyone can request fieldwork. The price is recalculated here from the project details, never taken from the browser. */
export const requestFieldwork = handle(async (req, db) => {
  const b = await readJson(req, 300_000);
  if (text(b.website, 200)) return json(200, { ok: true, ref: "Q-RECEIVED" }); // bots fill the hidden field
  const inputs = parseInputs(b.inputs);
  if (!inputs)
    return fail(
      400,
      "invalid_argument",
      "Some project details weren't recognised. Please reload the page and try again.",
    );
  const survey = parseSurvey(b.survey);
  const types = survey ? survey.questions.map((q) => q.type) : null;
  if (!f2fReady(inputs, types))
    return fail(400, "invalid_argument", "Upload a questionnaire or enter the interview length so we can price it.");
  const c = (b.contact && typeof b.contact === "object" ? b.contact : {}) as Record<string, unknown>;
  const name = text(c.name, 80),
    email = cleanEmail(c.email);
  const problems = [
    !name && "Enter your name.",
    !validEmail(email) && "Enter a valid email address.",
    c.consent !== true && "Tick the box so we can contact you.",
  ].filter(Boolean);
  if (problems.length) return fail(400, "invalid_argument", problems.join(" "));
  if (await tooMany(db, `fieldwork-ip|${clientIp(req)}`, 20, 864e5))
    return fail(429, "rate_limited", "Too many requests today. Please contact us directly.");

  const quote = f2fQuote(inputs, types);
  const user = await currentUser(db, req);
  let row = null;
  for (let attempt = 0; attempt < 5 && !row; attempt++) {
    const ref = `Q-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
    try {
      row = await db.fieldworkRequest.create({
        data: {
          ref,
          name,
          email,
          phone: text(c.phone, 40),
          organisation: text(c.organisation, 120),
          preferredStart: /^\d{4}-\d{2}-\d{2}$/.test(String(c.start)) ? String(c.start) : "",
          notes: text(c.notes, 1200),
          inputs: { ...inputs, minutes: quote.mins, n: quote.n } as unknown as Prisma.InputJsonValue,
          quote: quote as unknown as Prisma.InputJsonValue,
          quoteTotalUsd: Math.round(quote.total),
          surveySnapshot: survey ?? undefined,
          requesterId: user && user.email === email && user.emailVerifiedAt ? user.id : null,
        },
      });
    } catch (e) {
      if (!(e instanceof Error && /Unique constraint/i.test(e.message))) throw e;
    }
  }
  if (!row) return fail(500, "internal", "Please try again.");
  if (emailEnabled()) {
    const to = await adminRecipients(db, authConfig().adminEmails);
    const body = brandEmail({
      paragraphs: [
        `${name} (${email}${row.organisation ? `, ${row.organisation}` : ""}) requested ${F2F_METHODS[inputs.method].toLowerCase()} in ${inputs.country}.`,
        `Quote ${row.ref}: ${usd0(quote.total)} for ${quote.resp} ${inputs.method === "fgd" ? "participants" : "interviews"}, about ${quote.weeks} weeks.`,
        ...(row.notes ? [`Notes: ${row.notes}`] : []),
      ],
      button: "Open Paper Survey requests",
      link: `${trustedBase(req) ?? ""}/admin/fieldwork`,
      footer: "You're receiving this because you're an Afrimetrica site administrator.",
    });
    for (const addr of to) sendInBackground(addr, `New Paper Survey request from ${name}`, body);
  }
  return json(200, { ok: true, ref: row.ref, total: quote.total });
});

export const adminUpdateFieldwork = (id: string) =>
  handle(async (req, db) => {
    const { user, error } = await requireSiteAdmin(db, req);
    if (error) return error;
    const status = (await readJson(req)).status as FieldworkStatus;
    if (!FIELDWORK_STATUSES.includes(status)) return fail(400, "invalid_argument", "Unknown status.");
    const r = await db.fieldworkRequest.findUnique({ where: { id } });
    if (!r) return fail(404, "not_found", "Request not found.");
    await db.$transaction([
      db.fieldworkRequest.update({ where: { id }, data: { status } }),
      db.auditEvent.create({
        data: {
          actorId: user.id,
          action: "fieldwork.status",
          entityType: "FieldworkRequest",
          entityId: id,
          metadata: { ref: r.ref, from: r.status, to: status },
        },
      }),
    ]);
    return json(200, { id, status });
  });

export const adminFieldworkCsv = handle(async (req, db) => {
  const { user, error } = await requireSiteAdmin(db, req);
  if (error) return error;
  const rows = await db.fieldworkRequest.findMany({ orderBy: { createdAt: "asc" } });
  const lines = [
    csvRow([
      "Received on",
      "Ref",
      "Name",
      "Email",
      "Phone",
      "Organisation",
      "Method",
      "Country",
      "Interviews or participants",
      "Quote (USD)",
      "Preferred start",
      "Notes",
      "Status",
    ]),
    ...rows.map((r) => {
      const inp = r.inputs as { method?: keyof typeof F2F_METHODS; country?: string };
      const q = r.quote as { resp?: number };
      return csvRow([
        isoDay(r.createdAt),
        r.ref,
        r.name,
        r.email,
        r.phone,
        r.organisation,
        inp.method ? F2F_METHODS[inp.method] : "",
        inp.country ?? "",
        q.resp ?? "",
        r.quoteTotalUsd,
        r.preferredStart,
        r.notes,
        FIELDWORK_LABEL[r.status],
      ]);
    }),
  ];
  await audit(db, {
    actorId: user.id,
    action: "fieldwork.export",
    entityType: "FieldworkRequest",
    entityId: "all",
    metadata: { rows: rows.length },
    ip: clientIp(req),
  });
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afrimetrica-paper-survey-requests-${isoDay(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
