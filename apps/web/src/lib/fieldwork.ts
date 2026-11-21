// Paper Survey (face-to-face fieldwork) pricing, ported unchanged from Phase 1 (public/index.html, f2fQuote).
// Used by the quote page in the browser AND recalculated on the server when a request is sent,
// so the price recorded is always the real one. tests/unit/fieldwork-parity.test.ts compares it with Phase 1.
import type { QuestionTypeCode } from "@/lib/surveys";

export const F2F_TIER: Record<string, "A" | "B"> = {
  "United States": "A",
  "United Kingdom": "A",
  Canada: "A",
  Germany: "A",
  France: "A",
  Netherlands: "A",
  Spain: "A",
  Italy: "A",
  Australia: "A",
  "South Africa": "B",
  Brazil: "B",
  Mexico: "B",
};
export const tierOf = (c: string): "A" | "B" | "C" => F2F_TIER[c] ?? "C";
const RATE = {
  A: {
    min: 1.5,
    minFee: 12,
    idiMin: 60,
    idiRecruit: 70,
    transcribe: 1.4,
    fgdModerate: 800,
    fgdVenue: 350,
    fgdRecruit: 90,
    entry: 2,
  },
  B: {
    min: 0.75,
    minFee: 5,
    idiMin: 25,
    idiRecruit: 25,
    transcribe: 0.9,
    fgdModerate: 400,
    fgdVenue: 150,
    fgdRecruit: 35,
    entry: 1.2,
  },
  C: {
    min: 0.4,
    minFee: 3,
    idiMin: 15,
    idiRecruit: 12,
    transcribe: 0.6,
    fgdModerate: 220,
    fgdVenue: 80,
    fgdRecruit: 15,
    entry: 1,
  },
};
export const F2F_METHODS = {
  questionnaire: "Face-to-face questionnaire",
  idi: "In-depth interviews (one-to-one)",
  fgd: "Focus group discussions",
} as const;
export const AUDIENCE = {
  general: ["General public", 1],
  group: ["A specific group (students, employees, patients…)", 1.25],
  business: ["Business owners or professionals", 1.6],
  exec: ["Senior executives or hard-to-reach people", 2.2],
} as const;
export const SETTING = {
  urban: ["Cities and towns", 1, 15],
  mixed: ["Urban and rural mix", 1.15, 25],
  rural: ["Mostly rural", 1.35, 40],
} as const;
export const REPORTS = {
  none: ["Data only (dashboard and Excel)", 0],
  summary: ["Summary report", 250],
  full: ["Full report and presentation", 650],
} as const;
export const CAPTURE = { tablet: "Tablet (faster, fewer errors)", paper: "Paper and pen, entered afterwards" } as const;
export const URGENCY = {
  standard: "Standard start (about 2 weeks)",
  rush: "Rush start (within 5 working days)",
} as const;
const TIME_PER: Record<QuestionTypeCode, number> = {
  SINGLE: 0.3,
  MULTI: 0.45,
  LIKERT: 0.3,
  RATING: 0.3,
  NUMBER: 0.35,
  TEXT: 1.2,
};
const r2 = (x: number) => Math.round(x * 100) / 100;

export interface FieldworkInputs {
  method: keyof typeof F2F_METHODS;
  n: number | string;
  groups: number | string;
  perGroup: number | string;
  country: string;
  setting: keyof typeof SETTING;
  audience: keyof typeof AUDIENCE;
  capture: keyof typeof CAPTURE;
  minutes: number | string; // "" = estimate from the questions
  languages: number | string;
  backTranslation: boolean;
  record: boolean;
  transcription: boolean;
  incentive: number | string;
  report: keyof typeof REPORTS;
  urgency: keyof typeof URGENCY;
}
export const DEFAULT_INPUTS: FieldworkInputs = {
  method: "questionnaire",
  n: 300,
  groups: 4,
  perGroup: 8,
  country: "Ghana",
  setting: "urban",
  audience: "general",
  capture: "tablet",
  minutes: "",
  languages: 0,
  backTranslation: false,
  record: false,
  transcription: true,
  incentive: "",
  report: "summary",
  urgency: "standard",
};

export function f2fMinutes(F: FieldworkInputs, types: QuestionTypeCode[]) {
  if (+F.minutes > 0) return Math.min(240, Math.round(+F.minutes));
  if (F.method === "fgd") return 90;
  if (F.method === "idi")
    return Math.min(90, Math.max(30, Math.round(types.reduce((a, t) => a + (t === "TEXT" ? 4 : 1.5), 0)) + 5));
  return Math.max(5, Math.round(1.5 + types.reduce((a, t) => a + (TIME_PER[t] ?? 0.3), 0)));
}
export const f2fGroups = (F: FieldworkInputs) => Math.max(1, Math.min(60, Math.floor(+F.groups || 1)));
export const f2fPerGroup = (F: FieldworkInputs) => Math.max(4, Math.min(12, Math.floor(+F.perGroup || 8)));
/** A quote needs a survey, a stated length, or a focus-group method (which has a standard length). */
export const f2fReady = (F: FieldworkInputs, types: QuestionTypeCode[] | null) =>
  !!types || +F.minutes > 0 || F.method === "fgd";

export interface QuoteLine {
  group: string;
  label: string;
  qty: number;
  unit: number;
  amount: number;
}
export interface Quote {
  lines: QuoteLine[];
  total: number;
  per: number;
  resp: number;
  mins: number;
  tier: "A" | "B" | "C";
  fieldDays: number;
  weeks: number;
  people: string;
  qn: number;
  n: number;
}

/** `types` are the question types of the survey being priced, or null when there's no survey. */
export function f2fQuote(F: FieldworkInputs, types: QuestionTypeCode[] | null): Quote {
  const tier = tierOf(F.country),
    T = RATE[tier],
    aud = AUDIENCE[F.audience][1],
    set = SETTING[F.setting][1],
    travel = SETTING[F.setting][2];
  const qs = types ?? [];
  const qn = qs.length,
    mins = f2fMinutes(F, qs),
    n = Math.max(1, Math.min(100000, Math.floor(+F.n || 0))),
    langs = Math.max(0, Math.min(10, Math.floor(+F.languages || 0)));
  const L: QuoteLine[] = [];
  const add = (group: string, label: string, qty: number, unit: number) => {
    const amount = r2(qty * unit);
    if (amount > 0) L.push({ group, label, qty, unit: r2(unit), amount });
    return amount;
  };
  let field = 0,
    days = 0,
    people = "";
  if (F.method === "questionnaire") {
    field += add(
      "Fieldwork",
      `Interviewer fee per completed interview (${mins} min)`,
      n,
      Math.max(T.minFee, mins * T.min) * aud * set,
    );
    if (F.capture === "paper") {
      const pages = Math.ceil(qn / 6) + 1;
      add("Data capture", `Printing questionnaires (${pages} pages each)`, n, pages * 0.08);
      add("Data capture", "Double data entry and cleaning", n, Math.max(1, qn) * 0.06 * T.entry);
    } else add("Data capture", "Tablet data collection (devices, offline app, daily upload)", n, 0.6);
    if (F.record) add("Data capture", "Audio recording for quality checks", n, 0.5);
    const perDay = Math.max(2, Math.floor(330 / (mins + travel))),
      team = Math.min(30, Math.max(2, Math.ceil(n / (perDay * 8))));
    days = Math.ceil(n / (perDay * team));
    people = `${team} interviewers, about ${perDay} interviews each per day`;
  } else if (F.method === "idi") {
    field += add(
      "Fieldwork",
      `Skilled interviewer per in-depth interview (${mins} min)`,
      n,
      Math.max(T.idiMin, mins * T.min * 2.2) * aud * set,
    );
    field += add("Fieldwork", "Recruiting and scheduling each participant", n, T.idiRecruit * aud);
    if (F.transcription)
      add("Transcripts", `Word-for-word transcription (${mins} audio min each)`, n, mins * T.transcribe);
    if (F.transcription && langs) add("Transcripts", "Translating transcripts into English", n, mins * 0.8);
    const team = Math.min(8, Math.max(1, Math.ceil(n / 12)));
    days = Math.ceil(n / (3 * team));
    people = `${team} interviewer${team > 1 ? "s" : ""}, about 3 interviews each per day`;
  } else {
    const g = f2fGroups(F),
      pp = f2fPerGroup(F);
    field += add("Fieldwork", "Moderator per group (about 90 min)", g, T.fgdModerate * set);
    field += add("Fieldwork", "Venue, refreshments and recording", g, T.fgdVenue * set);
    field += add("Fieldwork", `Recruiting participants (${pp} per group)`, g * pp, T.fgdRecruit * aud);
    if (F.transcription) add("Transcripts", "Transcription per group (90 min of audio)", g, 90 * T.transcribe * 1.3);
    if (F.transcription && langs) add("Transcripts", "Translating transcripts into English", g, 90 * 0.8 * 1.3);
    days = Math.ceil(g / 2);
    people = "1 moderator team, up to 2 groups a day";
  }
  const resp = F.method === "fgd" ? f2fGroups(F) * f2fPerGroup(F) : n;
  add("Fieldwork", "Supervision and quality back-checks (15% of fieldwork)", 1, field * 0.15);
  add(
    "Set-up",
    "Questionnaire review, interviewer briefing and training",
    1,
    180 + qn * 4 + (F.method !== "questionnaire" ? 120 : 0),
  );
  if (langs) {
    add("Set-up", `Translation into ${langs} extra language${langs > 1 ? "s" : ""}`, langs, 60 + qn * 6);
    if (F.backTranslation) add("Set-up", "Independent back-translation check", langs, (60 + qn * 6) * 0.6);
  }
  add("Management", "Project management (12%)", 1, L.reduce((a, x) => a + x.amount, 0) * 0.12);
  if (F.urgency === "rush")
    add("Management", "Rush start within 5 working days (+25% on fieldwork)", 1, field * 1.15 * 0.25);
  if (REPORTS[F.report][1]) add("Reporting", REPORTS[F.report][0], 1, REPORTS[F.report][1]);
  if (+F.incentive > 0)
    add("Incentives", "Thank-you payments to respondents (passed through at cost)", resp, Math.min(500, +F.incentive));
  const total = r2(L.reduce((a, x) => a + x.amount, 0));
  const totalDays =
    (F.urgency === "rush" ? 3 : 5) + (langs ? 3 : 0) + days + { none: 2, summary: 4, full: 8 }[F.report];
  return {
    lines: L,
    total,
    per: r2(total / resp),
    resp,
    mins,
    tier,
    fieldDays: days,
    weeks: Math.max(1, Math.ceil(totalDays / 5)),
    people,
    qn,
    n,
  };
}

/** Checks inputs sent to the server; anything unknown falls back to a safe default or is rejected. */
export function parseInputs(raw: unknown): FieldworkInputs | null {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T extends Record<string, unknown>>(v: unknown, obj: T) =>
    typeof v === "string" && v in obj ? (v as keyof T) : null;
  const method = pick(b.method, F2F_METHODS),
    setting = pick(b.setting, SETTING),
    audience = pick(b.audience, AUDIENCE);
  const capture = pick(b.capture ?? "tablet", CAPTURE),
    report = pick(b.report, REPORTS),
    urgency = pick(b.urgency ?? "standard", URGENCY);
  if (
    !method ||
    !setting ||
    !audience ||
    !capture ||
    !report ||
    !urgency ||
    typeof b.country !== "string" ||
    !b.country
  )
    return null;
  const num = (v: unknown) => (v === "" || v == null ? "" : Number.isFinite(Number(v)) ? Number(v) : "");
  return {
    method,
    setting,
    audience,
    capture,
    report,
    urgency,
    country: b.country.slice(0, 60),
    n: num(b.n),
    groups: num(b.groups),
    perGroup: num(b.perGroup),
    minutes: num(b.minutes),
    languages: num(b.languages),
    incentive: num(b.incentive),
    backTranslation: b.backTranslation === true,
    record: b.record === true,
    transcription: b.transcription === true,
  };
}
