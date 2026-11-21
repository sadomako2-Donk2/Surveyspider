import "server-only";
import { CURRENCIES, parseDay, toMinor } from "@/lib/academy";
import { BadRequest } from "../http";

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface SessionInput {
  id?: string;
  startsOn: Date | null;
  endsOn: Date | null;
  location: string;
  seats: number;
  feeMinor: number;
  currency: (typeof CURRENCIES)[number];
}

/** Checks a course sent by the admin editor. Throws BadRequest with a message people can act on. */
export function parseCourse(b: Record<string, unknown>) {
  const title = text(b.title, 150);
  if (!title) throw new BadRequest("Give the course a title.");
  const status = (b.status ?? "DRAFT") as (typeof STATUSES)[number];
  if (!STATUSES.includes(status)) throw new BadRequest("Status must be draft, published or archived.");
  const outcomes = Array.isArray(b.outcomes) ? b.outcomes.map((o) => text(o, 300)).filter(Boolean) : [];
  if (outcomes.length > 20) throw new BadRequest("Use at most 20 learning outcomes.");
  const rawSessions = Array.isArray(b.sessions) ? b.sessions : [];
  if (rawSessions.length > 50) throw new BadRequest("Use at most 50 dates per course.");
  const sessions: SessionInput[] = rawSessions.map((raw, i) => {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const n = `Date ${i + 1}`;
    const startsOn = parseDay(s.startsOn),
      endsOn = parseDay(s.endsOn);
    if (startsOn && Number.isNaN(startsOn.getTime())) throw new BadRequest(`${n}: the start date isn't valid.`);
    if (endsOn && Number.isNaN(endsOn.getTime())) throw new BadRequest(`${n}: the end date isn't valid.`);
    if (startsOn && endsOn && endsOn < startsOn) throw new BadRequest(`${n}: the end date is before the start date.`);
    const seats = Number(s.seats ?? 0);
    if (!Number.isInteger(seats) || seats < 0 || seats > 100_000)
      throw new BadRequest(`${n}: seats must be a whole number (0 means no limit).`);
    const feeMinor = toMinor(s.fee);
    if (Number.isNaN(feeMinor)) throw new BadRequest(`${n}: enter the fee as a number, like 1200 or 150.50.`);
    const currency = (s.currency ?? "USD") as SessionInput["currency"];
    if (!CURRENCIES.includes(currency)) throw new BadRequest(`${n}: currency must be ${CURRENCIES.join(", ")}.`);
    return {
      id: typeof s.id === "string" && s.id ? s.id : undefined,
      startsOn,
      endsOn,
      location: text(s.location, 120),
      seats,
      feeMinor,
      currency,
    };
  });
  return {
    course: {
      title,
      status,
      level: text(b.level, 40),
      format: text(b.format, 40),
      duration: text(b.duration, 80),
      summary: text(b.summary, 400),
      description: text(b.description, 6000),
      outcomes,
      audience: text(b.audience, 400),
      certificate: b.certificate !== false,
    },
    sessions,
  };
}
