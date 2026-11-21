// Course helpers shared by server and browser code (no database access here).

export const CURRENCIES = ["USD", "GHS", "GBP", "EUR"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];
const SYMBOL: Record<CurrencyCode, string> = { USD: "US$", GHS: "GH₵", GBP: "£", EUR: "€" };

export const LEVELS = ["Introductory", "Intermediate", "Advanced"] as const;
export const FORMATS = ["In person", "Online", "Hybrid"] as const;

export const ENROLLMENT_STATUSES = [
  "REGISTERED",
  "INTEREST",
  "CONFIRMED",
  "ATTENDED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type EnrollmentStatusCode = (typeof ENROLLMENT_STATUSES)[number];
export const ENROLLMENT_LABEL: Record<EnrollmentStatusCode, string> = {
  REGISTERED: "Registered",
  INTEREST: "Interest registered",
  CONFIRMED: "Confirmed",
  ATTENDED: "Attended",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Fee in minor units (cents, pesewas, pence) → "GH₵1,200" or "Free". */
export function formatFee(feeMinor: number, currency: string): string {
  if (!(feeMinor > 0)) return "Free";
  const major = feeMinor / 100;
  const sym = SYMBOL[currency as CurrencyCode] ?? `${currency} `;
  return (
    sym +
    major.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(major) ? 0 : 2, maximumFractionDigits: 2 })
  );
}

/** "12.50" → 1250. Returns NaN for anything that isn't a non-negative amount with at most 2 decimals. */
export function toMinor(v: unknown): number {
  const s = String(v ?? "")
    .trim()
    .replace(/,/g, "");
  if (s === "") return 0;
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

/** Calendar dates are stored as UTC midnight. "2099-03-01" ⇄ Date. */
export const isoDay = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
export function parseDay(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(NaN);
  const d = new Date(`${s}T00:00:00Z`);
  return isoDay(d) === s ? d : new Date(NaN);
}
export const todayUtc = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

export function formatDay(d: Date | string | null | undefined): string {
  if (!d) return "Date to be confirmed";
  const date = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
export function formatDates(start: Date | string | null | undefined, end: Date | string | null | undefined): string {
  const a = formatDay(start);
  const b = end ? formatDay(end) : "";
  return b && b !== a ? `${a} – ${b}` : a;
}

export function seatsText(seats: number, taken: number): string {
  if (!(seats > 0)) return "Places available";
  const left = Math.max(0, seats - taken);
  return left === 0 ? "Full" : `${left} seat${left === 1 ? "" : "s"} left`;
}

export function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70)
      .replace(/-+$/g, "") || "course"
  );
}

/** One CSV cell. Cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas. */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
