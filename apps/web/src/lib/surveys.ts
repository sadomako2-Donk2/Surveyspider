// Survey rules shared by the builder (browser) and the server, so both always agree.
import templateData from "@/content/survey-templates.json";

export const QUESTION_TYPES = ["SINGLE", "MULTI", "RATING", "LIKERT", "TEXT", "NUMBER"] as const;
export type QuestionTypeCode = (typeof QUESTION_TYPES)[number];
export const QUESTION_TYPE_LABEL: Record<QuestionTypeCode, string> = {
  SINGLE: "Multiple choice",
  MULTI: "Checkboxes",
  RATING: "Rating scale",
  LIKERT: "Likert scale",
  TEXT: "Short text",
  NUMBER: "Number",
};

export interface Scale {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}
export interface QuestionInput {
  id?: string; // database id (read-only; drafts get new ids when saved)
  type: QuestionTypeCode;
  text: string;
  options: string[];
  scale?: Scale | null;
  required: boolean;
}

export const LIKERT_SETS = templateData.likert as Record<string, { label: string; options: string[] }>;
export const SCALE_PRESETS: [number, number][] = [
  [1, 5],
  [1, 7],
  [1, 9],
  [1, 10],
  [0, 10],
];
export const DEFAULT_SCALE: Scale = { min: 1, max: 5, minLabel: "Lowest", maxLabel: "Highest" };

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Ghana",
  "Nigeria",
  "Kenya",
  "South Africa",
  "India",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Australia",
  "Brazil",
  "Mexico",
  "Philippines",
  "Other",
];
export const OCCUPATIONS = [
  "Student",
  "Employed full-time",
  "Employed part-time",
  "Self-employed / business owner",
  "Looking for work",
  "Retired",
  "Homemaker",
];
export const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

export const PLATFORM_FEE = 0.25; // Afrimetrica's commission on participant rewards (same as Phase 1)
export const MIN_HOURLY_USD = 8; // recommended minimum pay
export const DEFAULT_CONSENT =
  "I agree to take part in this survey. I understand that my answers will be used for research, reported only in summary form, and that I can stop at any time before submitting.";

/** The attention check is added by the system; it is never stored as one of the survey's questions. */
export const ATTENTION = {
  key: "__attention",
  text: 'To show you are reading carefully, please choose "Purple".',
  options: ["Red", "Green", "Purple", "Blue"],
  answer: "Purple",
} as const;

export interface Screening {
  minAge: number;
  maxAge: number;
  countries: string[];
  occupations: string[];
}
export const OPEN_SCREENING: Screening = { minAge: 18, maxAge: 120, countries: [], occupations: [] };
export const screensPeople = (s: Screening) =>
  s.minAge > 18 || s.maxAge < 120 || s.countries.length > 0 || s.occupations.length > 0;

export interface Profile {
  age: number;
  gender: string;
  country: string;
  occupation: string;
}
export function eligible(s: Screening, p: Profile | null): boolean {
  if (!screensPeople(s)) return true;
  if (!p) return false;
  return (
    p.age >= s.minAge &&
    p.age <= s.maxAge &&
    (!s.countries.length || s.countries.includes(p.country)) &&
    (!s.occupations.length || s.occupations.includes(p.occupation))
  );
}

/** People who finish in under 30% of the expected time are flagged for review (same rule as Phase 1). */
export const isSpeeder = (seconds: number | null | undefined, minutes: number) =>
  seconds != null && minutes > 0 && seconds < minutes * 60 * 0.3;

export const hourlyRate = (rewardMinor: number, minutes: number) =>
  minutes > 0 ? rewardMinor / 100 / (minutes / 60) : 0;
/** Most the survey can cost: every reward plus the platform fee, in minor units. */
export const maxCostMinor = (rewardMinor: number, target: number) =>
  Math.round(rewardMinor * target * (1 + PLATFORM_FEE));

// ---------- questions ----------

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function scaleOf(raw: unknown): Scale {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) =>
    v === "" || v == null || !Number.isFinite(Number(v)) ? d : Math.round(Number(v));
  return {
    min: num(s.min, DEFAULT_SCALE.min),
    max: num(s.max, DEFAULT_SCALE.max),
    minLabel: s.minLabel == null ? DEFAULT_SCALE.minLabel : str(s.minLabel, 60),
    maxLabel: s.maxLabel == null ? DEFAULT_SCALE.maxLabel : str(s.maxLabel, 60),
  };
}

/** Tidies one question (trims text, fills defaults). Doesn't decide whether it's valid: see questionProblems. */
export function normaliseQuestion(raw: unknown): QuestionInput {
  const q = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const type = (QUESTION_TYPES as readonly string[]).includes(String(q.type).toUpperCase())
    ? (String(q.type).toUpperCase() as QuestionTypeCode)
    : "SINGLE";
  const options = Array.isArray(q.options) ? q.options.map((o) => str(o, 200)).filter(Boolean) : [];
  return {
    ...(typeof q.id === "string" ? { id: q.id } : {}),
    type,
    text: str(q.text, 500),
    options: type === "SINGLE" || type === "MULTI" || type === "LIKERT" ? options : [],
    scale: type === "RATING" ? scaleOf(q.scale) : null,
    required: q.required !== false,
  };
}

/** Problems with a list of questions, in plain language, numbered as people see them. Empty = fine. */
export function questionProblems(questions: QuestionInput[]): string[] {
  const out: string[] = [];
  if (!questions.length) out.push("Add at least one question.");
  if (questions.length > 300) out.push("Use at most 300 questions.");
  questions.forEach((q, i) => {
    const n = `Question ${i + 1}`;
    if (!q.text) out.push(`${n} has no wording.`);
    if (q.type === "SINGLE" || q.type === "MULTI" || q.type === "LIKERT") {
      if (q.options.length < 2) out.push(`${n} needs at least two answer options.`);
      if (q.options.length > 50) out.push(`${n} has more than 50 answer options.`);
      if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length)
        out.push(`${n} has the same answer option twice.`);
    }
    if (q.type === "RATING" && q.scale) {
      const { min, max } = q.scale;
      if (!(min >= 0 && max > min && max - min <= 10))
        out.push(`${n}: the scale must run upwards from 0 or more, with at most 11 points (like 1–5, 1–10 or 0–10).`);
    }
  });
  return out;
}

// ---------- answers ----------

export type AnswerValue = string | number | string[];

/**
 * Checks answers against the questions they belong to. Returns clean values keyed by question id,
 * plus the numbers of required questions left unanswered and any invalid answers.
 */
export function checkAnswers(questions: (QuestionInput & { id: string })[], raw: Record<string, unknown>) {
  const answers: Record<string, AnswerValue> = {};
  const missing: number[] = [];
  const invalid: number[] = [];
  const known = new Set(questions.map((q) => q.id));
  const unknown = Object.keys(raw).filter((k) => !known.has(k) && k !== ATTENTION.key);
  questions.forEach((q, i) => {
    const v = raw[q.id];
    const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (q.required) missing.push(i + 1);
      return;
    }
    let clean: AnswerValue | undefined;
    if (q.type === "SINGLE" || q.type === "LIKERT")
      clean = typeof v === "string" && q.options.includes(v) ? v : undefined;
    else if (q.type === "MULTI")
      clean =
        Array.isArray(v) &&
        v.every((x) => typeof x === "string" && q.options.includes(x)) &&
        new Set(v).size === v.length
          ? (v as string[])
          : undefined;
    else if (q.type === "RATING") {
      const s = scaleOf(q.scale),
        n = Number(v);
      clean = Number.isInteger(n) && n >= s.min && n <= s.max ? n : undefined;
    } else if (q.type === "NUMBER") {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      clean = Number.isFinite(n) && Math.abs(n) <= 1e12 ? n : undefined;
    } else clean = typeof v === "string" ? v.trim().slice(0, 1000) : undefined;
    if (clean === undefined || clean === "") invalid.push(i + 1);
    else answers[q.id] = clean;
  });
  return { answers, missing, invalid, unknown };
}

// ---------- templates ----------

export interface SurveyTemplate {
  key: string;
  group: "research" | "train";
  name: string;
  blurb: string;
  title: string;
  description: string;
  minutes: number;
  reward: number;
  target: number;
  occupations: string[];
  questions: QuestionInput[];
}
export const SURVEY_TEMPLATES: SurveyTemplate[] = (templateData.templates as unknown as SurveyTemplate[]).map((t) => ({
  ...t,
  questions: t.questions.map((q) => normaliseQuestion(q)),
}));
