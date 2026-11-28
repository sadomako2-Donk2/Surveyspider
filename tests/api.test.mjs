// Tests the server's sign-in, API and permission rules.
// Run: node tests/api.test.mjs   (no Anthropic key or real Google account needed)
import http from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
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
// A stand-in for Resend's email API that records what would be sent.
const emails = [];
const fakeResend = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    if (req.headers.authorization !== "Bearer test-resend-key") { res.writeHead(401); return res.end("{}"); }
    emails.push(JSON.parse(body)); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ id: "em_" + emails.length }));
  });
});
await new Promise((r) => fakeResend.listen(0, r));

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "ss-"));
process.env.ADMIN_CODE = "test-admin-code";
process.env.ADMIN_EMAILS = "boss@example.com";
process.env.GOOGLE_CLIENT_ID = GOOGLE_ID;
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_TOKEN_URL = `http://127.0.0.1:${fakeGoogle.address().port}/token`;
delete process.env.ANTHROPIC_API_KEY;
process.env.RESEND_API_KEY = "test-resend-key";
process.env.RESEND_API_URL = `http://127.0.0.1:${fakeResend.address().port}/emails`;
process.env.EMAIL_FROM = "Afrimetrica <hello@afrimetrica.test>";
process.env.PUBLIC_URL = "https://surveyspider.test";
process.env.BING_SITE_VERIFICATION = "ABCDEF0123456789ABCDEF0123456789";
process.env.GOOGLE_SITE_VERIFICATION = '<meta name="google-site-verification" content="abcDEF123_-xyz456" />';
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lastMail = (addr, rx) => [...emails].reverse().find((e) => e.to[0] === addr && rx.test(e.subject));
const tokenIn = (m, param) => m && new URL(m.text.match(/https:\/\/\S+/)[0]).searchParams.get(param);
async function confirmLatest(addr) { await wait(150); return (await browser("z").call("POST", "/api/auth/verify", { token: tokenIn(lastMail(addr, /Confirm/), "verify") })).status === 200; }
const study = { id: "s1", title: "Test survey", status: "live", target: 2, reward: 1, minutes: 5, questions: [{ id: "q1", type: "single", text: "Pick", options: ["A", "B"], required: true }], screen: { minAge: 18, maxAge: 99, countries: [], occupations: [] } };

const A = browser("a"), B = browser("b"), C = browser("c");
const page = await fetch(base + "/"); check("home page is served", page.status === 200 && (await page.text()).includes("Afrimetrica"));
const homeHtml = await (await fetch(base + "/")).text();
check("the Google ownership code is in the page (pasted whole tag is accepted)", homeHtml.includes('<meta name="google-site-verification" content="abcDEF123_-xyz456">'));
const robots = await fetch(base + "/robots.txt"), robotsText = await robots.text();
check("robots.txt lets search engines in, keeps them out of the API, and names the sitemap", robots.status === 200 && /Allow: \//.test(robotsText) && /Disallow: \/api\//.test(robotsText) && robotsText.includes("Sitemap: https://surveyspider.test/sitemap.xml"));
const sitemap = await fetch(base + "/sitemap.xml");
const smText = await sitemap.text();
check("sitemap.xml lists every public page at its real address", sitemap.status === 200 && /xml/.test(sitemap.headers.get("content-type")) && smText.includes("<loc>https://surveyspider.test/</loc>") && smText.includes("<loc>https://surveyspider.test/training/venue/ghana</loc>") && (smText.match(/<loc>/g) || []).length > 200 && !/<loc>https:\/\/surveyspider\.test\/(studies|create|results|account|admin|signin)[/<]/.test(smText));
check("the Bing ownership code is in the page", homeHtml.includes('<meta name="msvalidate.01" content="ABCDEF0123456789ABCDEF0123456789">'));
check("the home page has its canonical address, social preview and organisation details", homeHtml.includes('<link rel="canonical" href="https://surveyspider.test/">') && homeHtml.includes('property="og:image" content="https://surveyspider.test/social.jpg"') && /"@type":"Organization"/.test(homeHtml));
const aboutPage = await fetch(base + "/about"), aboutHtml = await aboutPage.text();
check("public pages have real addresses with their own title and description", aboutPage.status === 200 && /<title>An independent, Africa-focused professional services firm \| Afrimetrica<\/title>/.test(aboutHtml) && aboutHtml.includes('<link rel="canonical" href="https://surveyspider.test/about">') && !aboutHtml.includes(`<meta name="description" content="Data, research and executive training, survey tools`));
const coursePath = smText.match(/<loc>https:\/\/surveyspider\.test(\/training\/course\/[a-z0-9-]+)<\/loc>/)[1];
const courseHtml = await (await fetch(base + coursePath)).text();
check("course pages describe the course for search engines", /"@type":"Course"/.test(courseHtml) && /"provider":\{"@type":"Organization"/.test(courseHtml));
const oneCourse = JSON.parse(readFileSync(new URL("../public/pages.json", import.meta.url), "utf8")).find((p) => p.canonical);
const subjHtml = await (await fetch(base + oneCourse.path)).text();
check("a one-course subject page points search engines to its course and isn't in the sitemap", subjHtml.includes(`<link rel="canonical" href="https://surveyspider.test${oneCourse.canonical}">`) && !smText.includes(`<loc>https://surveyspider.test${oneCourse.path}</loc>`) && smText.includes(`<loc>https://surveyspider.test${oneCourse.canonical}</loc>`));
check("pages without real content yet are left out of the sitemap", !/case-studies|\/videos</.test(smText));
check("descriptions are kept to search-result length", [homeHtml, aboutHtml, courseHtml].every((h) => (h.match(/<meta name="description" content="([^"]*)"/) || [, "x".repeat(999)])[1].length <= 170));
const unknown = await fetch(base + "/training/course/not-a-course");
check("unknown public addresses still open the app but aren't indexed", unknown.status === 404 && (await unknown.text()).includes('<meta name="robots" content="noindex">'));
const slash = await fetch(base + "/about/", { redirect: "manual" });
check("a trailing slash redirects to the page's address", slash.status === 301 && slash.headers.get("location") === "/about");
check("app pages don't get public addresses", (await fetch(base + "/studies")).status === 404 && (await fetch(base + "/admin")).status === 404);
const social = await fetch(base + "/social.jpg");
check("the social preview image is served", social.status === 200 && social.headers.get("content-type") === "image/jpeg");
// Repositioning: five practices, positioning copy, and a staging switch that keeps copies out of search engines.
for (const id of ["data-intelligence", "research-evaluation", "strategy-advisory", "executive-education", "digital-solutions"]) {
  const r = await fetch(base + "/practices/" + id), h = await r.text();
  check(`practice page /practices/${id} is served, listed and canonical`, r.status === 200 && h.includes(`<link rel="canonical" href="https://surveyspider.test/practices/${id}">`) && smText.includes(`<loc>https://surveyspider.test/practices/${id}</loc>`));
}
check("the home page uses the new positioning", /<title>Afrimetrica — Data, Research, Advisory and Executive Education<\/title>/.test(homeHtml) && homeHtml.includes('<meta name="description" content="An independent, Africa-focused professional services firm specialising in data intelligence, research, strategic advisory and executive education'));
const pageSrc = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
check("the main menu has What We Do, Executive Education and Insights", pageSrc.includes('["practices", "What We Do"], ["training", "Executive Education"]') && pageSrc.includes('["resources", "Insights"]'));
check("old unit names are gone from the pages", !/Afrimetrica (Consulting|Analytics|Academy)|Knowledge Hub/.test(pageSrc));
check("the approach page under Research & Advisory points to About", (await (await fetch(base + "/consultancy/approach")).text()).includes('<link rel="canonical" href="https://surveyspider.test/about/approach">'));
check("the certificates page under About points search engines to the Executive Education one", (await (await fetch(base + "/about/certificates")).text()).includes('<link rel="canonical" href="https://surveyspider.test/training/certificates">') && !smText.includes("<loc>https://surveyspider.test/about/certificates</loc>"));
for (const [from, to] of [["/analytics", "/practices/data-intelligence"], ["/analytics/", "/practices/data-intelligence"], ["/resources/articles", "/resources"]]) {
  const r = await fetch(base + from + "?utm=x", { redirect: "manual" });
  check(`merged page ${from} permanently redirects to ${to}`, r.status === 301 && r.headers.get("location") === to + "?utm=x");
}
check("merged pages are not in the sitemap, their replacements are", !smText.includes("<loc>https://surveyspider.test/analytics</loc>") && !smText.includes("<loc>https://surveyspider.test/resources/articles</loc>") && smText.includes("<loc>https://surveyspider.test/resources</loc>") && (await fetch(base + "/resources/articles/sample")).status === 200);
{
  // Our people content model: every profile has a confirmed title, a group, an affiliation and a practices list;
  // only approved leadership titles are used; no equity wording.
  const people = [...pageSrc.matchAll(/\{ id: "[a-z-]+", name: "[^"]+", title: "[^"]+", group: "(leadership|directors|professional|fellows|network)", affiliation: "(permanent|project|visiting)", practices: \[[^\]]*\]/g)];
  check("every person has a title, group, affiliation and practices in the people data", people.length === 7 && !/\bconst TEAM\b/.test(pageSrc));
  check("partner and director titles appear only as the approved leadership roles", (pageSrc.match(/role: "(Managing Partner|Partner, [^"]+|Director, [^"]+)"/g) || []).length === 6 && !/(Associate Partner|Principal Consultant|equity|shareholder)/i.test(pageSrc.slice(pageSrc.indexOf("const PEOPLE = ["), pageSrc.indexOf("function abTeam"))));
}
check("old addresses still open (no page removed)", (await fetch(base + "/analytics/service/statistics")).status === 200 && (await fetch(base + "/consultancy/service/policy")).status === 200 && (await fetch(base + "/about/team")).status === 200);
check("production pages are indexable", !(await fetch(base + "/")).headers.get("x-robots-tag") && !homeHtml.includes('content="noindex'));
process.env.NOINDEX = "1";
{
  const r = await fetch(base + "/about"), h = await r.text(), robotsStaging = await (await fetch(base + "/robots.txt")).text();
  check("a staging copy (NOINDEX=1) is kept out of search engines", r.headers.get("x-robots-tag") === "noindex, nofollow" && h.includes('<meta name="robots" content="noindex, nofollow">') && /Disallow: \/\n/.test(robotsStaging) && !/Allow: \//.test(robotsStaging));
}
delete process.env.NOINDEX;
const sec = await fetch(base + "/"), csp = sec.headers.get("content-security-policy") || "";
check("pages send a content security policy that allows only this site's scripts, styles and fonts", /script-src 'self' 'unsafe-inline'(;|$)/.test(csp) && /object-src 'none'/.test(csp) && /frame-ancestors 'self'/.test(csp) && /font-src 'self'(;|$)/.test(csp) && !/googleapis|gstatic/.test(csp));
const font = await fetch(base + "/fonts/inter-latin-400-normal.woff2");
check("brand fonts are served from this site, and the page loads no outside fonts", font.status === 200 && font.headers.get("content-type") === "font/woff2" && (await font.arrayBuffer()).byteLength > 10000 && !/fonts\.(googleapis|gstatic)/.test(homeHtml) && (await fetch(base + "/fonts/README.md")).status !== 200);
check("pages send permissions and opener policies", /camera=\(\)/.test(sec.headers.get("permissions-policy") || "") && sec.headers.get("cross-origin-opener-policy") === "same-origin");
check("HSTS is sent over https only", !sec.headers.get("strict-transport-security") && /max-age=31536000/.test((await fetch(base + "/healthz", { headers: { "X-Forwarded-Proto": "https" } })).headers.get("strict-transport-security") || ""));
const lib = await fetch(base + "/vendor/exceljs.min.js");
check("browser libraries are served from this site", lib.status === 200 && /javascript/.test(lib.headers.get("content-type")) && (await lib.arrayBuffer()).byteLength > 100000 && (await fetch(base + "/vendor/pdf.worker.min.js")).status === 200);
check("only listed library files are served", (await fetch(base + "/vendor/README.md")).status !== 200 && (await fetch(base + "/vendor/..%2Fserver.mjs")).status !== 200);
check("health check responds", (await A.call("GET", "/healthz")).status === 200);
const pic = await fetch(base + "/photos/p01-homepage-collaboration.webp");
check("website photos are served", pic.status === 200 && pic.headers.get("content-type") === "image/webp" && (await pic.arrayBuffer()).byteLength > 1000);
{
  // Every image the pages use is served, with its phone-sized copy where one is declared; reference-only images are never published.
  const page = await (await fetch(base + "/")).text();
  const used = [...page.matchAll(/\["([a-z0-9-]+\.webp)", "[^"]*", "[^"]*", "([^"]*)"(, true)?\]/g)];
  const missing = [];
  for (const [, f, , small] of used) { if ((await fetch(base + "/photos/" + f)).status !== 200) missing.push(f); if (small && (await fetch(base + "/photos/" + f.replace(".webp", "-640.webp"))).status !== 200) missing.push(f + " (640)"); }
  check("every photo the pages list is served" + (missing.length ? ": missing " + missing.join(", ") : ""), used.length >= 10 && missing.length === 0);
  check("reference-only images (P08, P10) are never published", !/p08-|p10-/.test(page) && (await fetch(base + "/photos/p08-generated-business-district.webp")).status !== 200 && (await fetch(base + "/photos/p10-executive-group-portrait.webp")).status !== 200);
}
check("only listed photos are served (no other files)", (await fetch(base + "/photos/..%2Fserver.mjs")).status !== 200 && (await fetch(base + "/photos/missing.webp")).status !== 200);
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
// --- email verification ---
await wait(150);
const v1 = lastMail("a@example.com", /Confirm your email/);
check("sign-up sends a confirmation email", !!v1 && /verify=[0-9a-f]{64}#studies/.test(v1.text) && v1.text.startsWith("Hi Researcher,"));
check("new email accounts start unconfirmed", meA.user.verified === false);
check("unconfirmed users can save drafts", (await A.call("PUT", "/api/studies/dv", { ...study, id: "dv", status: "draft" })).status === 200);
check("unconfirmed users can't launch surveys", (await A.call("PUT", "/api/studies/dv", { ...study, id: "dv", status: "live" })).json.code === "verify_required");
check("unconfirmed users can't use AI", (await A.call("POST", "/api/ai", { input: "hi" })).json.code === "verify_required");
check("'send it again' sends a new link", (await A.call("POST", "/api/auth/resend-verification")).status === 200 && (await wait(150), tokenIn(lastMail("a@example.com", /Confirm/), "verify") !== tokenIn(v1, "verify")));
check("the older link stops working", (await C.call("POST", "/api/auth/verify", { token: tokenIn(v1, "verify") })).status === 400);
check("a made-up confirmation token is refused", (await C.call("POST", "/api/auth/verify", { token: "e".repeat(64) })).status === 400);
const vNew = tokenIn(lastMail("a@example.com", /Confirm/), "verify");
check("the confirmation link confirms the email (no sign-in needed)", (await C.call("POST", "/api/auth/verify", { token: vNew })).status === 200 && (await A.call("GET", "/api/me")).json.user.verified === true && (await C.call("GET", "/api/me")).json.user === null);
check("a confirmation link works only once", (await C.call("POST", "/api/auth/verify", { token: vNew })).status === 400);
check("confirmed users can launch", (await A.call("PUT", "/api/studies/dv", { ...study, id: "dv", status: "live" })).status === 200);
await A.call("DELETE", "/api/studies/dv");
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
check("unconfirmed participants can't take paid surveys", (await A.call("PUT", "/api/studies/s1", study)).status === 200 && (await B.call("PUT", `/api/responses/s1-${(await B.call("GET", "/api/me")).json.uid}`, { studyId: "s1", answers: { q1: "A" } })).json.code === "verify_required");
await confirmLatest("b@example.com");
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
{
  const Z = browser("9");
  for (let i = 0; i < 20; i++) await Z.call("GET", "/api/me", undefined, { "X-Admin-Code": "wrong-code-" + i, "CF-Connecting-IP": "203.0.113.9" });
  const locked = (await Z.call("GET", "/api/me", undefined, { "X-Admin-Code": "test-admin-code", "CF-Connecting-IP": "203.0.113.9" })).json.isAdmin;
  const other = (await Z.call("GET", "/api/me", undefined, { "X-Admin-Code": "test-admin-code", "CF-Connecting-IP": "203.0.113.10" })).json.isAdmin;
  check("repeated wrong admin codes lock that visitor out (others unaffected)", locked === false && other === true);
  let blocked = false;
  for (let i = 0; i < 32 && !blocked; i++) blocked = (await Z.call("POST", "/api/auth/login", { email: "target@example.com", password: "guess " + i }, { "X-Forwarded-For": "198.51.100." + i })).status === 429;
  check("password guessing is limited per account even from changing addresses", blocked);
}
const Boss = browser("d"); await Boss.call("POST", "/api/auth/signup", { email: "boss@example.com", password: "owner password" }); await confirmLatest("boss@example.com");
check("administrators can see that enquiry emails are switched on", (await Boss.call("GET", "/api/me")).json.notify === true);
check("other people don't see the email notification setting", (await A.call("GET", "/api/me")).json.notify === undefined);
check("emails in ADMIN_EMAILS are owners automatically", (await Boss.call("GET", "/api/me")).json.isAdmin === true && (await Boss.call("PATCH", "/api/fieldwork/fw1", { status: "won" })).status === 200);

// --- Afrimetrica Academy: courses and registrations ---
const course = { id: "c1", title: "Questionnaire Design", status: "draft", level: "Introductory", format: "Online", duration: "2 days", summary: "Write better questions.", description: "Long text.", outcomes: ["One", "Two"], audience: "Everyone", certificate: true,
  sessions: [{ id: "cs1", start: "2099-03-01", end: "2099-03-02", location: "Accra", seats: 1, fee: 150, currency: "GHS" }, { id: "cs2", start: "2099-04-01", location: "Zoom", seats: 0, fee: 0, currency: "USD" }] };
check("only administrators can create courses", (await A.call("PUT", "/api/courses/c1", course)).status === 403);
check("administrators can create courses", (await Boss.call("PUT", "/api/courses/c1", course)).status === 200);
check("draft courses are hidden from visitors", !(await C.call("GET", "/api/data")).json.courses.some((c) => c.id === "c1") && (await Boss.call("GET", "/api/data")).json.courses.some((c) => c.id === "c1"));
check("registration needs a published course", (await A.call("PUT", "/api/enrollments/e1", { courseId: "c1", sessionId: "cs1" })).status === 400);
await Boss.call("PUT", "/api/courses/c1", { ...course, status: "published", currency: "XXX", sessions: [...course.sessions, { id: "cs3", start: "2099-05-01", seats: 5, fee: 10, currency: "BTC" }] });
const pubC = (await C.call("GET", "/api/data")).json.courses.find((c) => c.id === "c1");
check("published courses are visible to everyone", !!pubC && pubC.sessions.length === 3);
check("unknown currencies fall back to USD", pubC.sessions.find((x) => x.id === "cs3").currency === "USD");
check("registration needs an account", (await C.call("PUT", "/api/enrollments/e0", { courseId: "c1", sessionId: "cs1" })).json.code === "auth_required");
const Un = browser("4"); await Un.call("POST", "/api/auth/signup", { email: "unconf@example.com", password: "unconfirmed 1" });
check("registration needs a confirmed email", (await Un.call("PUT", "/api/enrollments/e0", { courseId: "c1", sessionId: "cs1" })).json.code === "verify_required");
const reg = await A.call("PUT", "/api/enrollments/e1", { courseId: "c1", sessionId: "cs1", phone: "+233 20 000 0000", email: "spoof@evil.example", userId: "u_someone_else", status: "completed" });
check("signed-in users can register", reg.status === 200);
const e1 = (await A.call("GET", "/api/data")).json.enrollments.find((e) => e.id === "e1");
check("registrations use the account's own email, owner and status", e1 && e1.email === "a@example.com" && e1.userId === meA.uid && e1.status === "registered");
check("seat counts are shared with visitors", (await C.call("GET", "/api/data")).json.courses.find((c) => c.id === "c1").sessions.find((x) => x.id === "cs1").taken === 1);
check("you can't register twice for the same date", (await A.call("PUT", "/api/enrollments/e2", { courseId: "c1", sessionId: "cs1" })).status === 409);
check("full sessions refuse new registrations", (await B.call("PUT", "/api/enrollments/e3", { courseId: "c1", sessionId: "cs1" })).json.message.includes("full"));
check("sessions with no seat limit accept registrations", (await B.call("PUT", "/api/enrollments/e4", { courseId: "c1", sessionId: "cs2" })).status === 200);
check("interest without a date is recorded", (await B.call("PUT", "/api/enrollments/e5", { courseId: "c1" })).status === 200 && (await B.call("GET", "/api/data")).json.enrollments.find((e) => e.id === "e5").status === "interest");
check("people see only their own registrations", (await B.call("GET", "/api/data")).json.enrollments.every((e) => e.userId !== meA.uid) && (await A.call("GET", "/api/data")).json.enrollments.length === 1);
check("administrators see every registration", (await Boss.call("GET", "/api/data")).json.enrollments.length === 3);
check("people can't change another person's registration", (await B.call("PATCH", "/api/enrollments/e1", { status: "cancelled" })).status === 403);
check("people can't confirm their own place", (await A.call("PATCH", "/api/enrollments/e1", { status: "confirmed" })).status === 403);
check("administrators can confirm places", (await Boss.call("PATCH", "/api/enrollments/e1", { status: "confirmed" })).status === 200);
check("people can cancel their own registration", (await B.call("PATCH", "/api/enrollments/e4", { status: "cancelled" })).status === 200);
check("unknown statuses are refused", (await Boss.call("PATCH", "/api/enrollments/e1", { status: "paid" })).status === 400);
await wait(150);
check("administrators are emailed about registrations", emails.some((m) => m.to[0] === "boss@example.com" && /course registration: Questionnaire Design/.test(m.subject)));
check("only administrators can delete courses", (await A.call("DELETE", "/api/courses/c1")).status === 403);

// --- enquiries ---
const enq = { type: "consultancy", contact: { name: "Kofi", email: "kofi@example.com", organisation: "NGO" }, message: "We need an evaluation.", details: { service: "Monitoring and evaluation", budget: "Not sure yet" } };
const Anon = browser("1");
const q1r = await Anon.call("PUT", "/api/enquiries/q1", { ...enq, status: "won", requesterId: "u_x" });
check("enquiries work without an account", q1r.status === 200);
check("enquiries need a valid email", (await Anon.call("PUT", "/api/enquiries/q2", { ...enq, contact: { name: "K", email: "nope" } })).status === 400);
check("enquiries need a known type", (await Anon.call("PUT", "/api/enquiries/q3", { ...enq, type: "spam" })).status === 400);
check("enquiries need a message", (await Anon.call("PUT", "/api/enquiries/q4", { ...enq, message: "hi" })).status === 400);
check("an enquiry can't be overwritten", (await Anon.call("PUT", "/api/enquiries/q1", enq)).status === 409);
const myQ = (await Anon.call("GET", "/api/data")).json.enquiries;
check("senders see their own enquiry, always starting as new", myQ.length === 1 && myQ[0].status === "new");
check("other people can't see the enquiry", (await B.call("GET", "/api/data")).json.enquiries.length === 0);
check("administrators see enquiries", (await Boss.call("GET", "/api/data")).json.enquiries.some((e) => e.id === "q1"));
check("only administrators can update enquiries", (await Anon.call("PATCH", "/api/enquiries/q1", { status: "won" })).status === 403 && (await Boss.call("PATCH", "/api/enquiries/q1", { status: "contacted" })).status === 200);
await wait(150);
check("administrators are emailed about enquiries", emails.some((m) => m.to[0] === "boss@example.com" && /consultancy enquiry from Kofi/.test(m.subject)));
await Anon.call("POST", "/api/auth/signup", { email: "kofi@example.com", password: "kofi password 1" });
check("an enquiry sent before signing up moves into the new account", (await Anon.call("GET", "/api/data")).json.enquiries.some((e) => e.id === "q1"));
let enqLimited = false; const Spam = browser("6");
for (let i = 0; i < 12; i++) if ((await Spam.call("PUT", "/api/enquiries/sp" + i, enq, { "X-Forwarded-For": "203.0.113.9" })).status === 429) enqLimited = true;
check("enquiries are rate limited per connection", enqLimited);

// --- site settings ---
check("only administrators can change contact details", (await A.call("PUT", "/api/settings", { email: "x@example.com" })).status === 403);
check("administrators can set contact details", (await Boss.call("PUT", "/api/settings", { email: "info@afrimetrica.test", phone: "+233 30 000 0000", linkedin: "javascript:alert(1)" })).status === 200);
const st1 = (await C.call("GET", "/api/data")).json.settings;
check("contact details are public and unsafe links are dropped", st1.email === "info@afrimetrica.test" && !st1.linkedin);

// --- privacy: administrators don't read other people's survey answers ---
const bossData = (await Boss.call("GET", "/api/data")).json;
const others = bossData.responses.filter((r) => r.studyId === "s1");
check("administrators get response totals but no answers", others.length > 0 && others.every((r) => r.answers === undefined));
check("administrators don't see participants' account ids", others.every((r) => /^p_/.test(r.participantId)));
check("the survey's owner still sees the answers", (await A.call("GET", "/api/data")).json.responses.filter((r) => r.studyId === "s1").every((r) => r.answers !== undefined));

// --- Google sign-in ---
const G = browser("e");
const start = await G.call("GET", "/auth/google?next=create");
const authUrl = new URL(start.location), state = authUrl.searchParams.get("state");
check("Google sign-in redirects to Google with our client id", start.status === 302 && authUrl.searchParams.get("client_id") === GOOGLE_ID && /\/auth\/google\/callback$/.test(authUrl.searchParams.get("redirect_uri")) && authUrl.searchParams.get("scope") === "openid email profile");
check("a forged state is refused", (await G.call("GET", `/auth/google/callback?state=forged&code=ok`)).location.includes("auth_error=google_failed"));
const cb = await G.call("GET", `/auth/google/callback?state=${state}&code=ok`);
check("Google callback signs the user in and returns them to their page", cb.status === 302 && cb.location === "/?auth=google#create" && !!G.jar.ss_session);
const meG = (await G.call("GET", "/api/me")).json;
check("Google account gets name and verified email", meG.user && meG.user.email === "ama@example.com" && meG.user.name === "Ama Mensah" && meG.user.google && meG.user.verified === true);
check("a reused state is refused", (await G.call("GET", `/auth/google/callback?state=${state}&code=ok`)).location.includes("auth_error"));
const G2 = browser("f"); const s2 = new URL((await G2.call("GET", "/auth/google")).location).searchParams.get("state");
check("Google accounts with unverified email are refused", (await G2.call("GET", `/auth/google/callback?state=${s2}&code=unverified`)).location.includes("auth_error=google_email"));
check("password sign-in on a Google-only account explains what to do", /Google/.test((await B.call("POST", "/api/auth/login", { email: "ama@example.com", password: "whatever12" })).json.message));

// --- forgot password (Resend) ---
const R = browser("7"), R2 = browser("8");
await R.call("POST", "/api/auth/signup", { name: "Rita Reset", email: "rita@example.com", password: "first password" });
await R2.call("POST", "/api/auth/login", { email: "rita@example.com", password: "first password" });
check("reset emails are advertised when Resend is configured", (await R.call("GET", "/api/me")).json.emailReset === true);
check("forgot-password needs a valid email", (await C.call("POST", "/api/auth/forgot", { email: "nope" })).status === 400);
const before = emails.length;
check("unknown emails get the same answer", (await C.call("POST", "/api/auth/forgot", { email: "nobody@example.com" })).status === 200);
await wait(200); check("no email is sent for unknown accounts", emails.length === before);
check("known emails get the same answer", (await C.call("POST", "/api/auth/forgot", { email: "Rita@Example.com" })).status === 200);
await wait(200);
const mail = emails[emails.length - 1];
const link = mail && (mail.text.match(/https:\/\/\S+/) || [])[0];
const token = link && new URL(link).searchParams.get("reset");
check("reset email goes to the account, from the configured sender", mail && mail.to[0] === "rita@example.com" && mail.from === "Afrimetrica <hello@afrimetrica.test>" && /Reset your Afrimetrica password/.test(mail.subject));
check("reset link points at the real site, never the request's Host", link && link.startsWith("https://surveyspider.test/?reset=") && /#signin$/.test(link) && mail.html.includes("Hi Rita"));
check("forged Host headers can't redirect the link", (await C.call("POST", "/api/auth/forgot", { email: "rita@example.com" }, { "X-Forwarded-Host": "evil.example" })).status === 200 && (await wait(200), emails[emails.length - 1].text.includes("https://surveyspider.test/")));
const fresh = new URL(emails[emails.length - 1].text.match(/https:\/\/\S+/)[0]).searchParams.get("reset");
check("asking again cancels the older link", (await C.call("POST", "/api/auth/reset", { token, password: "new password 1" })).status === 400);
check("a made-up token is refused", (await C.call("POST", "/api/auth/reset", { token: "f".repeat(64), password: "new password 1" })).status === 400);
check("a short new password is refused (and the link still works)", (await C.call("POST", "/api/auth/reset", { token: fresh, password: "short" })).status === 400);
const done = await C.call("POST", "/api/auth/reset", { token: fresh, password: "brand new password" });
check("a valid link sets the new password and signs in", done.status === 200 && done.json.user.email === "rita@example.com" && !!C.jar.ss_session);
check("the old password no longer works", (await browser("9").call("POST", "/api/auth/login", { email: "rita@example.com", password: "first password" })).status === 401);
check("the new password works", (await browser("0").call("POST", "/api/auth/login", { email: "rita@example.com", password: "brand new password" })).status === 200);
check("resetting by email also confirms the address", (await browser("0").call("POST", "/api/auth/login", { email: "rita@example.com", password: "brand new password" })).json.user.verified === true);
check("every other session is signed out", (await R.call("GET", "/api/me")).json.user === null && (await R2.call("GET", "/api/me")).json.user === null);
check("a reset link works only once", (await C.call("POST", "/api/auth/reset", { token: fresh, password: "another password" })).status === 400);
const sentBefore = emails.filter((e) => e.to[0] === "rita@example.com" && /Reset/.test(e.subject)).length;
for (let i = 0; i < 4; i++) await C.call("POST", "/api/auth/forgot", { email: "rita@example.com" });
await wait(300);
check("at most 3 reset emails per address per hour", sentBefore === 2 && emails.filter((e) => e.to[0] === "rita@example.com" && /Reset/.test(e.subject)).length === 3);
const X = browser("x"); await X.call("POST", "/api/auth/signup", { name: "<script>alert(1)</script>", email: "xss@example.com", password: "xss password" });
await C.call("POST", "/api/auth/forgot", { email: "xss@example.com" }); await wait(200);
const xm = emails[emails.length - 1];
check("names are escaped in the email HTML", xm.to[0] === "xss@example.com" && !/<script/i.test(xm.html) && xm.html.includes("&lt;script&gt;"));

// --- one public address ---
const viaHost = (host, pathname) => new Promise((resolve) => http.get({ host: "127.0.0.1", port: server.address().port, path: pathname, headers: { Host: host } }, (r) => { r.resume(); resolve({ status: r.statusCode, location: r.headers.location }); }));
const old = await viaHost("surveyspider.onrender.com", "/?x=1");
check("other addresses redirect to PUBLIC_URL, keeping the path", old.status === 301 && old.location === "https://surveyspider.test/?x=1");
check("the bare domain redirects too", (await viaHost("bare-domain.test", "/pricing")).location === "https://surveyspider.test/pricing");
check("the public address itself is served", (await viaHost("surveyspider.test", "/")).status === 200);
check("Render's health check is never redirected", (await viaHost("surveyspider.onrender.com", "/healthz")).status === 200);

console.log(`\n${pass} passed, ${failN} failed`);
server.close(); fakeGoogle.close(); fakeResend.close(); process.exit(failN ? 1 : 0);
