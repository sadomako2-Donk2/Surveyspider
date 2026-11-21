import "server-only";
import { formatDates, formatFee, isoDay, seatsText, todayUtc } from "@/lib/academy";
import type { CourseWithSeats } from "./service";

/** Plain, serialisable session data for pages and browser components. */
export function sessionView(s: CourseWithSeats["sessions"][number]) {
  const past = !!s.startsOn && s.startsOn < todayUtc();
  return {
    id: s.id,
    start: isoDay(s.startsOn),
    dates: formatDates(s.startsOn, s.endsOn),
    location: s.location,
    fee: formatFee(s.feeMinor, s.currency),
    paid: s.feeMinor > 0,
    seats: seatsText(s.seats, s.taken),
    full: s.seats > 0 && s.taken >= s.seats,
    past,
  };
}
export type SessionView = ReturnType<typeof sessionView>;

export function courseCardView(c: CourseWithSeats) {
  const next = c.sessions.map(sessionView).find((s) => !s.past);
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    tags: [c.level, c.format, c.duration].filter(Boolean),
    next,
  };
}
export type CourseCardView = ReturnType<typeof courseCardView>;
