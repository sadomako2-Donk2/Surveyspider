// Builds tests/fixtures/phase1-store.json by driving the REAL Phase 1 server (repository root server.mjs)
// through its API with made-up people, so the import is tested against Phase 1's actual file format.
// Run from the repository root:  node apps/web/scripts/phase1/make-fixture.mjs
// All names and emails are fictional (example.com / example.org).
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const here = import.meta.dirname;
const dataDir = mkdtempSync(path.join(tmpdir(), "p1-fixture-"));
Object.assign(process.env, { DATA_DIR: dataDir, ADMIN_EMAILS: "boss@example.com", PUBLIC_URL: "" });
for (const k of ["ANTHROPIC_API_KEY", "RESEND_API_KEY", "GOOGLE_CLIENT_ID", "ADMIN_CODE"]) delete process.env[k];
const { server } = await import(path.join(here, "../../../../server.mjs"));
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let ch = 0;
function browser() {
  const jar = {},
    token = "abcdef"[ch++ % 6].repeat(24) + String(ch).padStart(24, "0");
  return async (method, url, body) => {
    const cookie = Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    const r = await fetch(base + url, {
      method,
      headers: { "Content-Type": "application/json", "X-Client-Token": token, ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of r.headers.getSetCookie()) {
      const [kv] = c.split(";"),
        i = kv.indexOf("=");
      jar[kv.slice(0, i)] = kv.slice(i + 1);
    }
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${url} -> ${r.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };
}
async function person(email, name) {
  const call = browser();
  await call("POST", "/api/auth/signup", { email, name, password: "phase one password" });
  const me = await call("GET", "/api/me");
  return { call, uid: me.uid };
}

const agree = ["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"];
const owner = await person("owner@example.com", "Abena Owner");
const boss = await person("boss@example.com", "Site Boss");
const people = [];
const profiles = [
  [34, "Woman", "Ghana", "Employed full-time"],
  [41, "Man", "Ghana", "Self-employed / business owner"],
  [29, "Woman", "Ghana", "Student"],
  [52, "Man", "Kenya", "Retired"],
];
for (const [i, [age, gender, country, occupation]] of profiles.entries()) {
  const p = await person(`participant${i + 1}@example.com`, `Participant ${i + 1}`);
  await p.call("PUT", "/api/profile", { age, gender, country, occupation });
  people.push({ ...p, demo: { age, gender, country, occupation } });
}

// A live survey with every question type, as the Phase 1 builder saves it.
const questions = [
  { id: "q_useful", type: "likert", text: "The course was useful.", options: agree, required: true },
  {
    id: "q_nps",
    type: "rating",
    text: "How likely are you to recommend it?",
    options: [],
    required: true,
    scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Very likely" },
  },
  { id: "q_mode", type: "single", text: "How did you attend?", options: ["In person", "Online"], required: true },
  {
    id: "q_liked",
    type: "multi",
    text: "What did you like?",
    options: ["Trainer", "Materials", "Venue"],
    required: false,
  },
  { id: "q_years", type: "number", text: "Years of experience", options: [], required: false },
  { id: "q_more", type: "text", text: "What should we improve?", options: [], required: false },
  { id: "q_gone", type: "text", text: "A question deleted after people answered", options: [], required: false },
];
const study = {
  id: "s_live1",
  title: "Course feedback",
  description: "Tell us about the course. Answers are anonymous.",
  minutes: 5,
  reward: 1.25,
  target: 100,
  attention: true,
  screen: { minAge: 18, maxAge: 99, countries: [], occupations: [] },
  questions,
  status: "live",
  launchedAt: Date.now() - 5 * 864e5,
};
await owner.call("PUT", "/api/studies/s_live1", study);
const answers = [
  ["Strongly agree", 10, "In person", ["Trainer", "Materials"], 12, "More examples", "x"],
  ["Agree", 9, "In person", ["Trainer"], 3, "", "y"],
  ["Agree", 8, "Online", [], null, "Longer breaks", ""],
  ["Disagree", 3, "Online", ["Venue"], 30, "Too fast", ""],
];
for (const [i, p] of people.entries()) {
  const a = Object.fromEntries(
    questions.map((q, j) => [q.id, answers[i][j]]).filter(([, v]) => v !== null && v !== ""),
  );
  a.attn = "Purple";
  await p.call("PUT", `/api/responses/s_live1-${p.uid}`, {
    studyId: "s_live1",
    answers: a,
    passedAttention: i !== 3,
    speeder: false,
    durationSec: 200 + i * 10,
    demographics: p.demo,
  });
}
// The owner's own test answer, and one rejected response.
await owner.call("PUT", `/api/responses/s_live1-${owner.uid}`, {
  studyId: "s_live1",
  answers: { q_useful: "Agree" },
  passedAttention: true,
  speeder: false,
  durationSec: 100,
  demographics: null,
});
await owner.call("PATCH", `/api/responses/s_live1-${people[3].uid}`, { status: "rejected" });
// Phase 1 allowed editing a live survey: one question is deleted after people answered it.
await owner.call("PUT", "/api/studies/s_live1", {
  ...study,
  questions: questions.filter((q) => q.id !== "q_gone"),
  library: { headline: "Most people found the course useful", publishedAt: Date.now() - 864e5 },
  aiReport: {
    headline: "Usefulness is high",
    summary: "Three of four found it useful.",
    generatedAt: Date.now() - 864e5,
    n: 3,
    findings: [{ title: "Useful", detail: "75% agreed." }],
    themes: [],
    recommendations: [{ action: "Add examples", why: "Asked for twice.", priority: "high" }],
    caveats: ["Small sample."],
  },
});
await owner.call("PUT", "/api/actions/a_1", {
  studyId: "s_live1",
  title: "Add more worked examples",
  why: "Requested in comments",
  assignee: "Kofi",
  due: "2026-12-15",
  priority: "high",
  status: "planned",
  metricQ: "q_useful",
  baseline: { value: 75, at: Date.now() },
  target: 85,
  followId: "",
  createdAt: Date.now(),
});
await owner.call("PUT", "/api/studies/s_draft1", {
  id: "s_draft1",
  title: "Draft idea",
  description: "",
  minutes: 3,
  reward: 0,
  target: 50,
  attention: false,
  screen: { minAge: 18, maxAge: 99, countries: ["Ghana"], occupations: [] },
  questions: [{ id: "q_d1", type: "single", text: "", options: ["Option 1", "Option 2"], required: true }],
  status: "draft",
});
await owner.call("PUT", "/api/studies/s_closed1", {
  id: "s_closed1",
  title: "Old pulse check",
  description: "",
  minutes: 2,
  reward: 0.5,
  target: 10,
  attention: false,
  screen: { minAge: 18, maxAge: 99, countries: [], occupations: [] },
  questions: [
    {
      id: "q_c1",
      type: "rating",
      text: "How are you?",
      options: [],
      required: true,
      scale: { min: 1, max: 5, minLabel: "Bad", maxLabel: "Good" },
    },
  ],
  status: "closed",
  launchedAt: Date.now() - 30 * 864e5,
});

// Academy, contact settings, enquiries and a Paper Survey request.
await boss.call("PUT", "/api/courses/c_stats", {
  title: "Applied Statistics with R",
  status: "published",
  level: "Intermediate",
  format: "In person",
  duration: "3 days",
  summary: "Hands-on statistics.",
  description: "Regression and more.",
  audience: "Analysts",
  outcomes: ["Fit regression models"],
  certificate: true,
  sessions: [
    { id: "ss_a", start: "2026-12-01", end: "2026-12-03", location: "Accra", seats: 20, fee: 450, currency: "GHS" },
  ],
});
await boss.call("PUT", "/api/courses/c_draft", { title: "Survey Design", status: "draft", sessions: [] });
await people[0].call("PUT", "/api/enrollments/e_1", {
  courseId: "c_stats",
  sessionId: "ss_a",
  name: "Participant 1",
  phone: "+233200000001",
  organisation: "Example Org",
  notes: "Vegetarian lunch",
});
await people[1].call("PUT", "/api/enrollments/e_2", { courseId: "c_stats", sessionId: "", name: "Participant 2" });
await boss.call("PATCH", "/api/enrollments/e_1", { status: "confirmed" });
await boss.call("PUT", "/api/settings", {
  email: "hello@example.org",
  phone: "+233 30 000 0000",
  whatsapp: "",
  address: "Accra, Ghana",
  hours: "Mon–Fri 9–5",
  linkedin: "https://www.linkedin.com/company/example",
});
const visitor = browser();
await visitor("PUT", "/api/enquiries/q_1", {
  type: "analytics",
  contact: { name: "Visitor Without Account", email: "Visitor@Example.org" },
  subject: "Panel data",
  message: "We need help analysing panel data.",
  details: { service: "Statistical analysis", timeline: "1 month", budget: "" },
});
await people[1].call("PUT", "/api/enquiries/q_2", {
  type: "consultancy",
  contact: { name: "Participant 2", email: "participant2@example.com" },
  message: "Evaluation design for an NGO.",
});
await boss.call("PATCH", "/api/enquiries/q_2", { status: "in_progress" });
await visitor("PUT", "/api/fieldwork/f_1", {
  ref: "Q-AB12CD",
  contact: {
    name: "Clinic Lead",
    org: "Example Clinic",
    email: "clinic@example.org",
    phone: "",
    start: "2027-01-10",
    notes: "Two regions",
  },
  inputs: { method: "f2f", sample: 400, minutes: 20 },
  survey: { title: "Patient survey", questions: 18 },
  quote: { total: 5321.4, lines: [] },
});
await boss.call("PATCH", "/api/fieldwork/f_1", { status: "quoted" });

await new Promise((r) => setTimeout(r, 600)); // Phase 1 saves 250 ms after the last change
copyFileSync(path.join(dataDir, "store.json"), path.join(here, "../../tests/fixtures/phase1-store.json"));
server.close();
console.log("Wrote tests/fixtures/phase1-store.json");
process.exit(0);
