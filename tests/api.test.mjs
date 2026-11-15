// Tests the server's sign-in, API and permission rules.
// Run: node tests/api.test.mjs   (no Anthropic key or real Google account needed)
import http from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// A stand-in for Google's token endpoint, so the whole Google sign-in flow can be tested offline.
const GOOGLE_ID = "test-client.apps.googleusercontent.com";
const fakeGoogle = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    const p = new URLSearchParams(body), b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const who = p.get("code") === "unverified" ? { email: "x@unverified.test", email_verified: false } : { email: "Ama@Example.com", email_verified: true, name: "Ama Mensah" };
    const idToken = [b64({ alg: "RS256" }), b64({ iss: "https://accounts.google.com", aud: GOOGLE_ID, sub: "g-123", exp: Math.floor(Date.now() / 1000) + 3600, ...who }), "sig"].join(".");
    res.writeHead(p.get("client_secret") === "test-secret" ? 200 : 401, { "Content-Type": "application/json" }); res.end(JSON.stringify({ id_token: idToken }));
  });
});
await new Promise((r) => fakeGoogle.listen(0, r));

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "ss-"));
process.env.ADMIN_CODE = "test-admin-code";
process.env.ADMIN_EMAILS = "boss@example.com";
process.env.GOOGLE_CLIENT_ID = GOOGLE_ID;
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_TOKEN_URL = `http://127.0.0.1:${fakeGoogle.address().port}/token`;
delete process.env.ANTHROPIC_API_KEY;
const { server } = await import("../server.mjs");
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

// Each "browser" has its own anonymous token and cookie jar.
function browser(ch) {
  const jar = {}, token = ch.repeat(48);
  const call = async (method, url, body, extra = {}) => {
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
    const r = await fetch(base + url, { method, redirect: "manual", headers: { "Content-Type": "application/json", "X-Client-Token": token, ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/Max-Age=0/.test(c)) delete jar[k]; else jar[k] = v; }
    return { status: r.status, location: r.headers.get("location"), setCookie: r.headers.getSetCookie(), json: r.status === 204 || r.status === 302 ? null : await r.json().catch(() => null) };
  };
  return { call, jar };
}
let pass = 0, failN = 0;
const check = (name, ok) => { ok ? pass++ : failN++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); };
const study = { id: "s1", title: "Test survey", status: "live", target: 2, reward: 1, minutes: 5, questions: [{ id: "q1", type: "single", text: "Pick", options: ["A", "B"], required: true }], screen: { minAge: 18, maxAge: 99, countries: [], occupations: [] } };

const A = browser("a"), B = browser("b"), C = browser("c");
const page = await fetch(base + "/"); check("home page is served", page.status === 200 && (await page.text()).includes("SurveySpider"));
check("health check responds", (await A.call("GET", "/healthz")).status === 200);
const anonA = (await A.call("GET", "/api/me")).json;
check("visitors start signed out", anonA.user === null && /^c_/.test(anonA.uid));
check("Google sign-in is advertised when configured", anonA.google === true);

// --- signed-out visitors can browse but not save ---
check("saving a survey needs sign-in", (await A.call("PUT", "/api/studies/s0", study)).json.code === "auth_required");
check("AI needs sign-in", [401, 503].includes((await A.call("POST", "/api/ai", { input: "hi" })).status));
check("profiles need sign-in", (await A.call("PUT", "/api/profile", { age: 30 })).json.code === "auth_required");
const fw = { id: "fw1", ref: "Q-TEST", contact: { name: "Ama", email: "ama@example.com" }, inputs: { method: "questionnaire", n: 300 }, quote: { total: 4321, per: 14.4, weeks: 5, lines: [] } };
check("paper survey quote requests work without an account", (await A.call("PUT", "/api/fieldwork/fw1", fw)).status === 200);

// --- email sign-up and sign-in ---
check("short passwords are refused", (await A.call("POST", "/api/auth/signup", { email: "a@example.com", password: "short" })).status === 400);
check("bad emails are refused", (await A.call("POST", "/api/auth/signup", { email: "nope", password: "longenough1" })).status === 400);
const su = await A.call("POST", "/api/auth/signup", { name: "Researcher A", email: "A@Example.com ", password: "correct horse 1" });
check("sign-up creates an account and a session", su.status === 200 && su.json.user.email === "a@example.com" && !!A.jar.ss_session);
check("session cookie is HttpOnly and SameSite", su.setCookie.some((c) => /ss_session=/.test(c) && /HttpOnly/.test(c) && /SameSite=Lax/.test(c)));
const meA = (await A.call("GET", "/api/me")).json;
check("signed-in user gets an account id", meA.user && /^u_/.test(meA.uid) && meA.uid === meA.user.id);
check("work done before sign-up moves into the account", (await A.call("GET", "/api/data")).json.fieldwork.length === 1);
check("duplicate sign-up is refused", (await B.call("POST", "/api/auth/signup", { email: "a@example.com", password: "another pass 2" })).status === 409);
check("wrong password is refused", (await B.call("POST", "/api/auth/login", { email: "a@example.com", password: "wrong password" })).status === 401);
check("passwords are never returned", !JSON.stringify(meA).includes("passHash") && !JSON.stringify(meA).includes("salt"));
await A.call("POST", "/api/auth/logout");
check("sign-out ends the session", (await A.call("GET", "/api/me")).json.user === null);
check("sign-in works with the right password", (await A.call("POST", "/api/auth/login", { email: "a@example.com", password: "correct horse 1" })).status === 200 && (await A.call("GET", "/api/me")).json.uid === meA.uid);
let limited = false; for (let i = 0; i < 12; i++) if ((await C.call("POST", "/api/auth/login", { email: "a@example.com", password: "guess" + i })).status === 429) limited = true;
check("repeated wrong guesses are rate-limited", limited);

// --- permissions between two signed-in people ---
await B.call("POST", "/api/auth/signup", { email: "b@example.com", password: "participant pw" });
const meB = (await B.call("GET", "/api/me")).json;
check("owner can create a survey", (await A.call("PUT", "/api/studies/s1", study)).status === 200);
check("another user cannot edit it", (await B.call("PUT", "/api/studies/s1", { ...study, title: "hacked" })).status === 403);
check("another user cannot delete it", (await B.call("DELETE", "/api/studies/s1")).status === 403);
check("survey keeps its real owner", (await B.call("GET", "/api/data")).json.studies[0].ownerId === meA.uid);
await A.call("PUT", "/api/studies/d1", { ...study, id: "d1", status: "draft", title: "Secret draft" });
check("drafts are hidden from other users", !(await B.call("GET", "/api/data")).json.studies.some((s) => s.id === "d1"));
check("user cannot answer as someone else", (await B.call("PUT", `/api/responses/s1-${meA.uid}`, { studyId: "s1", answers: { q1: "A" } })).status === 400);
check("user can submit their own answer", (await B.call("PUT", `/api/responses/s1-${meB.uid}`, { studyId: "s1", answers: { q1: "A" }, passedAttention: true, reward: 999 })).status === 200);
check("answering twice is blocked", (await B.call("PUT", `/api/responses/s1-${meB.uid}`, { studyId: "s1", answers: { q1: "B" } })).status === 409);
const own = (await A.call("GET", "/api/data")).json.responses.find((r) => r.participantId === meB.uid);
check("server sets the reward, not the participant", own && own.reward === 1);
const anonView = (await C.call("GET", "/api/data")).json.responses;
check("signed-out visitors only see anonymous counts", anonView.length === 1 && !anonView[0].answers && !anonView[0].participantId);
check("only the owner can approve or reject", (await B.call("PATCH", `/api/responses/s1-${meB.uid}`, { status: "rejected" })).status === 403 && (await A.call("PATCH", `/api/responses/s1-${meB.uid}`, { status: "rejected" })).status === 200);
check("actions only on your own surveys", (await B.call("PUT", "/api/actions/a1", { studyId: "s1", title: "x" })).status === 400 && (await A.call("PUT", "/api/actions/a1", { studyId: "s1", title: "Fix it" })).status === 200);
check("actions are private to their owner", (await B.call("GET", "/api/data")).json.actions.length === 0 && (await A.call("GET", "/api/data")).json.actions.length === 1);
check("profiles are validated and private", (await B.call("PUT", "/api/profile", { age: 12 })).status === 400 && (await B.call("PUT", "/api/profile", { age: 30, country: "Ghana" })).status === 200 && (await A.call("GET", "/api/data")).json.profile === null);
check("quote requests are private", (await B.call("GET", "/api/data")).json.fieldwork.length === 0 && (await A.call("GET", "/api/data")).json.fieldwork.length === 1);
check("only the owner can change request status", (await A.call("PATCH", "/api/fieldwork/fw1", { status: "won" })).status === 403);
check("oversized surveys are refused", (await A.call("PUT", "/api/studies/big", { ...study, id: "big", questions: Array(301).fill(study.questions[0]) })).status === 400);
check("cross-site requests are refused", (await A.call("PUT", "/api/studies/s9", study, { Origin: "https://evil.example" })).status === 403);

// --- admin access ---
check("admin code unlocks the business view", (await C.call("GET", "/api/me", undefined, { "X-Admin-Code": "test-admin-code" })).json.isAdmin === true && (await C.call("GET", "/api/me", undefined, { "X-Admin-Code": "wrong" })).json.isAdmin === false);
const Boss = browser("d"); await Boss.call("POST", "/api/auth/signup", { email: "boss@example.com", password: "owner password" });
check("emails in ADMIN_EMAILS are owners automatically", (await Boss.call("GET", "/api/me")).json.isAdmin === true && (await Boss.call("PATCH", "/api/fieldwork/fw1", { status: "won" })).status === 200);

// --- Google sign-in ---
const G = browser("e");
const start = await G.call("GET", "/auth/google?next=create");
const authUrl = new URL(start.location), state = authUrl.searchParams.get("state");
check("Google sign-in redirects to Google with our client id", start.status === 302 && authUrl.searchParams.get("client_id") === GOOGLE_ID && /\/auth\/google\/callback$/.test(authUrl.searchParams.get("redirect_uri")) && authUrl.searchParams.get("scope") === "openid email profile");
check("a forged state is refused", (await G.call("GET", `/auth/google/callback?state=forged&code=ok`)).location.includes("auth_error=google_failed"));
const cb = await G.call("GET", `/auth/google/callback?state=${state}&code=ok`);
check("Google callback signs the user in and returns them to their page", cb.status === 302 && cb.location === "/?auth=google#create" && !!G.jar.ss_session);
const meG = (await G.call("GET", "/api/me")).json;
check("Google account gets name and verified email", meG.user && meG.user.email === "ama@example.com" && meG.user.name === "Ama Mensah" && meG.user.google);
check("a reused state is refused", (await G.call("GET", `/auth/google/callback?state=${state}&code=ok`)).location.includes("auth_error"));
const G2 = browser("f"); const s2 = new URL((await G2.call("GET", "/auth/google")).location).searchParams.get("state");
check("Google accounts with unverified email are refused", (await G2.call("GET", `/auth/google/callback?state=${s2}&code=unverified`)).location.includes("auth_error=google_email"));
check("password sign-in on a Google-only account explains what to do", /Google/.test((await B.call("POST", "/api/auth/login", { email: "ama@example.com", password: "whatever12" })).json.message));

console.log(`\n${pass} passed, ${failN} failed`);
server.close(); fakeGoogle.close(); process.exit(failN ? 1 : 0);
