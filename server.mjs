// Afrimetrica server for Render (or any Node 20+ host). Operated by Regelco International Ltd.
// Serves the single-page app, stores shared data in a JSON file, enforces who may change what,
// and calls Claude for the AI features with the server's own ANTHROPIC_API_KEY.
import http from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { createHash, timingSafeEqual, randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 10000;
const DATA_DIR = process.env.DATA_DIR || path.join(here, "data");
const ADMIN_CODE = process.env.ADMIN_CODE || "";
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const AI_LIMIT = Number(process.env.AI_REQUESTS_PER_HOUR) || 40; // per visitor
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const scrypt = promisify(scryptCb);
// Sign-in. Google is optional: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to turn it on.
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID || "", GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_AUTH_URL = process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
// When PUBLIC_URL is set (e.g. https://www.surveyspider.com), visitors on any other address
// (surveyspider.onrender.com, the bare domain) are sent there, so everyone uses one address.
const CANONICAL = (() => { try { return process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL) : null; } catch (e) { return null; } })();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
const SESSION_DAYS = 30;
// Password-reset emails through Resend (https://resend.com). Off until RESEND_API_KEY is set.
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const RESEND_URL = process.env.RESEND_API_URL || "https://api.resend.com/emails";
const EMAIL_FROM = process.env.EMAIL_FROM || "Afrimetrica <onboarding@resend.dev>";
const RESET_MINUTES = 60;

// ---------- page ----------
// Google Search Console ownership check: paste only the code from Google's "HTML tag" method into
// Render → Environment as GOOGLE_SITE_VERIFICATION (it isn't secret; Google shows it in the page).
const GOOGLE_VERIFY = (process.env.GOOGLE_SITE_VERIFICATION || "").trim().replace(/^.*content="([^"]+)".*$/s, "$1");
// Bing Webmaster Tools works the same way (BING_SITE_VERIFICATION); Bing also feeds DuckDuckGo and Yahoo.
const BING_VERIFY = (process.env.BING_SITE_VERIFICATION || "").trim().replace(/^.*content="([^"]+)".*$/s, "$1");
const SITE_VERIFY = (/^[A-Za-z0-9_-]{10,100}$/.test(GOOGLE_VERIFY) ? `<meta name="google-site-verification" content="${GOOGLE_VERIFY}">` : "") + (/^[A-Za-z0-9]{10,100}$/.test(BING_VERIFY) ? `<meta name="msvalidate.01" content="${BING_VERIFY}">` : "");
const SHELL_HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="Data, research and executive training, survey tools, data analysis and consultancy for organisations, governments and NGOs across Africa."><link rel="icon" type="image/svg+xml" href="/icon.svg">${SITE_VERIFY}<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`;
const PAGE = SHELL_HEAD + readFileSync(path.join(here, "public", "index.html"), "utf8") + "</body></html>";
const ICON = readFileSync(path.join(here, "public", "icon.svg"));
// Public pages with real addresses, for search engines (written by scripts/build-pages.mjs; see that file).
const PAGES = new Map((existsSync(path.join(here, "public", "pages.json")) ? JSON.parse(readFileSync(path.join(here, "public", "pages.json"), "utf8")) : [{ path: "/" }]).map((p) => [p.path, p]));
const PUBLIC_SECTIONS = /^\/(about|training|surveys|analytics|consultancy|resources|contact|privacy|terms|pricing|paper-survey)(\/[a-z0-9-]+)*$/;
const SOCIAL = existsSync(path.join(here, "public", "social.jpg")) ? readFileSync(path.join(here, "public", "social.jpg")) : null;
const DEFAULT_TITLE = "Afrimetrica — Data, Research and Executive Training";
const DEFAULT_DESC = "Data, research and executive training, survey tools, data analysis and consultancy for organisations, governments and NGOs across Africa.";
const attr = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const shorten = (t, n = 160) => { t = String(t || "").replace(/\s+/g, " ").trim(); if (t.length <= n) return t; const cut = t.slice(0, n - 1); return cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length).replace(/[,;:.\s]+$/, "") + "…"; };
// The page with its own title, description, canonical address, social preview and structured data.
function pageHtml(info, base, known) {
  const url = base + info.path, title = info.title || DEFAULT_TITLE;
  const desc = shorten(info.description && info.description !== DEFAULT_DESC ? info.description : info.h1 && info.path !== "/" ? `${info.h1}. ${DEFAULT_DESC}` : DEFAULT_DESC);
  const org = { "@type": "Organization", name: "Afrimetrica", url: base + "/", logo: base + "/photos/logo-full.webp", description: DEFAULT_DESC };
  const ld = info.path === "/" ? { "@context": "https://schema.org", "@graph": [org, { "@type": "WebSite", name: "Afrimetrica", url: base + "/" }] }
    : info.path.startsWith("/training/course/") ? { "@context": "https://schema.org", "@type": "Course", name: info.h1 || title, description: desc, url, provider: org } : null;
  const head = (known ? `<link rel="canonical" href="${attr(url)}">` : `<meta name="robots" content="noindex">`) +
    `<meta property="og:type" content="website"><meta property="og:site_name" content="Afrimetrica"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:url" content="${attr(url)}">` +
    (SOCIAL ? `<meta property="og:image" content="${attr(base)}/social.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">` : "") +
    (ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>` : "");
  return PAGE.replace(`<meta name="description" content="${DEFAULT_DESC}">`, `<meta name="description" content="${attr(desc)}">${head}`).replace(`<title>${DEFAULT_TITLE}</title>`, `<title>${attr(title)}</title>`);
}
// Photos for the public pages: every .webp in public/photos, read once at start. Only these exact names are served.
const PHOTO_DIR = path.join(here, "public", "photos");
const PHOTOS = new Map(existsSync(PHOTO_DIR) ? readdirSync(PHOTO_DIR).filter((f) => /^[a-z0-9-]+\.webp$/.test(f)).map((f) => [f, readFileSync(path.join(PHOTO_DIR, f))]) : []);

// ---------- storage ----------
mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, "store.json");
let db = { studies: {}, responses: {}, actions: {}, profiles: {}, fieldwork: {}, users: {}, sessions: {}, resets: {}, verifies: {}, courses: {}, enrollments: {}, enquiries: {}, settings: {} };
if (existsSync(FILE)) { try { db = { ...db, ...JSON.parse(readFileSync(FILE, "utf8")) }; } catch (e) { console.error("Could not read store.json; starting empty.", e); } }
let saveTimer = null;
function flush() { const tmp = FILE + ".tmp"; writeFileSync(tmp, JSON.stringify(db)); renameSync(tmp, FILE); }
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
for (const [k, v] of Object.entries(db.sessions)) if (v.expires < Date.now()) delete db.sessions[k];
for (const [k, v] of Object.entries(db.resets)) if (v.expires < Date.now()) delete db.resets[k];
for (const [k, v] of Object.entries(db.verifies)) if (v.expires < Date.now()) delete db.verifies[k];
// Accounts created before email verification existed count as confirmed, so nobody gets locked out.
for (const u of Object.values(db.users)) if (u.emailVerified === undefined) u.emailVerified = true;
const VERIFY_HOURS = 48;
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => { clearTimeout(saveTimer); try { flush(); } catch (e) {} process.exit(0); });

// ---------- identity ----------
const sha = (s) => createHash("sha256").update(s).digest("hex");
function cookies(req) {
  const out = {};
  String(req.headers.cookie || "").split(";").forEach((p) => { const i = p.indexOf("="); if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) {} } });
  return out;
}
const isHttps = (req) => String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
function addCookie(res, c) { const cur = res.getHeader("Set-Cookie"); res.setHeader("Set-Cookie", cur ? [].concat(cur, c) : [c]); }
const cookieStr = (req, name, val, maxAge, p = "/") => `${name}=${val}; Path=${p}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps(req) ? "; Secure" : ""}`;
function sessionUser(req) {
  const t = cookies(req).ss_session;
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  const sess = db.sessions[sha(t)];
  if (!sess || sess.expires < Date.now()) return null;
  return db.users[sess.userId] || null;
}
function startSession(req, res, user) {
  const tok = randomBytes(32).toString("hex");
  db.sessions[sha(tok)] = { userId: user.id, createdAt: Date.now(), expires: Date.now() + SESSION_DAYS * 864e5 };
  user.lastLogin = Date.now(); persist();
  addCookie(res, cookieStr(req, "ss_session", tok, SESSION_DAYS * 86400));
}
const publicUser = (u) => (u ? { id: u.id, email: u.email, name: u.name || "", google: !!u.googleSub, password: !!u.passHash, verified: u.emailVerified !== false } : null);
const findByEmail = (email) => Object.values(db.users).find((u) => u.email === email) || null;
function who(req) {
  const user = sessionUser(req);
  const t = String(req.headers["x-client-token"] || "");
  const anon = /^[0-9a-f]{48}$/.test(t) ? "c_" + sha(t).slice(0, 24) : null;
  const code = String(req.headers["x-admin-code"] || "");
  const codeOk = !!ADMIN_CODE && code.length === ADMIN_CODE.length && timingSafeEqual(Buffer.from(code), Buffer.from(ADMIN_CODE));
  return { uid: user ? user.id : anon, user, anon, isAdmin: codeOk || (!!user && ADMIN_EMAILS.includes(user.email)) };
}
// Move anything a visitor made before signing in into their account.
function claim(anon, uid) {
  if (!anon || !uid || anon === uid) return 0;
  let n = 0;
  for (const x of Object.values(db.studies)) if (x.ownerId === anon) { x.ownerId = uid; n++; }
  for (const x of Object.values(db.responses)) { if (x.participantId === anon) { x.participantId = uid; n++; } if (x.ownerId === anon) x.ownerId = uid; }
  for (const x of Object.values(db.actions)) if (x.ownerId === anon) { x.ownerId = uid; n++; }
  for (const x of Object.values(db.fieldwork)) if (x.requesterId === anon) { x.requesterId = uid; n++; }
  for (const x of Object.values(db.enquiries)) if (x.requesterId === anon) { x.requesterId = uid; n++; }
  if (db.profiles[anon]) { if (!db.profiles[uid]) db.profiles[uid] = db.profiles[anon]; delete db.profiles[anon]; n++; }
  if (n) persist();
  return n;
}
const tries = new Map();
function tooMany(key, max = 10, windowMs = 15 * 60e3) {
  const now = Date.now(), list = (tries.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now); tries.set(key, list); return list.length > max;
}
const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
async function hashPassword(pw, salt) { return (await scrypt(pw, salt, 64)).toString("hex"); }
async function handleAuth(req, res, me, action) {
  if (action === "logout") {
    const t = cookies(req).ss_session; if (t) delete db.sessions[sha(t)];
    addCookie(res, cookieStr(req, "ss_session", "", 0)); persist(); return send(res, 200, { ok: true });
  }
  if (action === "claim") { if (!me.user) return fail(res, 401, "auth_required", "Sign in first."); return send(res, 200, { claimed: claim(me.anon, me.user.id) }); }
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (action === "forgot") return forgotPassword(req, res, ip);
  if (action === "reset") return resetPassword(req, res, me, ip);
  if (action === "verify") return confirmEmail(req, res, ip);
  if (action === "resend-verification") return resendVerification(req, res, me);
  const b = await readBody(req, 10_000);
  const email = String((b && b.email) || "").trim().toLowerCase(), pw = String((b && b.password) || "");
  if (!EMAIL_RX.test(email) || email.length > 160) return fail(res, 400, "invalid_argument", "Enter a valid email address.");
  if (tooMany((req.headers["x-forwarded-for"] || req.socket.remoteAddress || "") + "|" + email)) return fail(res, 429, "rate_limited", "Too many attempts. Wait 15 minutes and try again.");
  const existing = findByEmail(email);
  if (action === "signup") {
    if (pw.length < 8 || pw.length > 200) return fail(res, 400, "invalid_argument", "Use a password of at least 8 characters.");
    if (existing) return fail(res, 409, "invalid_argument", existing.passHash ? "An account with this email already exists. Sign in instead." : "This email signs in with Google. Use Continue with Google.");
    const salt = randomBytes(16).toString("hex");
    const user = { id: "u_" + randomBytes(12).toString("hex"), email, name: String((b && b.name) || "").trim().slice(0, 80), salt, passHash: await hashPassword(pw, salt), createdAt: Date.now() };
    user.emailVerified = false;
    if (!queueVerification(req, user)) user.emailVerified = true; // no email service yet: don't block new users
    db.users[user.id] = user; startSession(req, res, user); claim(me.anon, user.id);
    return send(res, 200, { user: publicUser(user) });
  }
  if (action === "login") {
    if (existing && !existing.passHash) return fail(res, 401, "invalid_argument", "This email signs in with Google. Use Continue with Google.");
    const ok = existing && timingSafeEqual(Buffer.from(await hashPassword(pw, existing.salt), "hex"), Buffer.from(existing.passHash, "hex"));
    if (!ok) return fail(res, 401, "invalid_argument", "Wrong email or password.");
    startSession(req, res, existing); claim(me.anon, existing.id);
    return send(res, 200, { user: publicUser(existing) });
  }
  return fail(res, 404, "not_found", "Unknown sign-in route.");
}
// ---------- forgot password (email via Resend) ----------
const escHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Reset links must point at the real site. On Render, RENDER_EXTERNAL_URL is set automatically; locally we allow localhost.
function trustedBase(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const host = String(req.headers.host || "");
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : null;
}
async function sendEmail(to, subject, html, text) {
  const r = await fetch(RESEND_URL, { method: "POST", headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html, text }) });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}
// One branded layout for every Afrimetrica email (HTML plus a plain-text version).
function brandEmail(user, { paragraphs, button, link, footer }) {
  const first = user.name ? user.name.trim().split(/\s+/)[0] : "";
  const L = escHtml(link), hi = first ? "Hi " + first + "," : "Hi,";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f9;font-family:Arial,Helvetica,sans-serif;color:#0e1d3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f9;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde2ec;border-radius:12px">
<tr><td style="padding:28px 32px 0;font-size:22px;font-weight:800"><span style="color:#0e1d3a">Afrimetrica</span></td></tr>
<tr><td style="padding:20px 32px 6px;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px">${escHtml(hi)}</p>
${paragraphs.map((x) => `<p style="margin:0 0 14px">${escHtml(x)}</p>`).join("")}</td></tr>
<tr><td style="padding:6px 32px 22px"><a href="${L}" style="display:inline-block;background:#10285a;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${escHtml(button)}</a></td></tr>
<tr><td style="padding:0 32px 28px;font-size:13px;line-height:1.6;color:#56627a">
<p style="margin:0 0 10px">If the button doesn't work, copy this link into your browser:<br><a href="${L}" style="color:#10285a;word-break:break-all">${L}</a></p>
<p style="margin:0">${escHtml(footer)}</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${hi}\n\n${paragraphs.join("\n\n")}\n\n${button}:\n${link}\n\n${footer}\n`;
  return { html, text };
}
const resetEmail = (user, link) => brandEmail(user, {
  paragraphs: [`We received a request to reset the password for your Afrimetrica account (${user.email}). Click the button to choose a new one. The link works for ${RESET_MINUTES} minutes and can be used once.`],
  button: "Choose a new password", link, footer: "If you didn't ask for this, you can ignore this email. Your password won't change." });
const verifyEmailMsg = (user, link) => brandEmail(user, {
  paragraphs: [`Welcome to Afrimetrica! Please confirm that ${user.email} is your email address.`, `Once it's confirmed you can launch surveys, take paid studies and use the AI features. The link works for ${VERIFY_HOURS} hours.`],
  button: "Confirm my email", link, footer: "If you didn't create an Afrimetrica account, you can ignore this email." });
// Create a confirmation link and email it in the background. Returns false if no email can be sent.
function queueVerification(req, user) {
  const base = trustedBase(req);
  if (!RESEND_KEY || !base) return false;
  for (const [k, v] of Object.entries(db.verifies)) if (v.userId === user.id) delete db.verifies[k];
  const tok = randomBytes(32).toString("hex");
  db.verifies[sha(tok)] = { userId: user.id, createdAt: Date.now(), expires: Date.now() + VERIFY_HOURS * 3600e3 };
  persist();
  const m = verifyEmailMsg(user, `${base}/?verify=${tok}#studies`);
  sendEmail(user.email, "Confirm your email for Afrimetrica", m.html, m.text).catch((e) => console.error("Verification email failed:", e.message));
  return true;
}
const needsVerify = (u) => !!u && u.emailVerified === false && !!RESEND_KEY;
async function confirmEmail(req, res, ip) {
  const b = await readBody(req, 5_000);
  if (tooMany("verify-ip|" + ip, 30, 3600e3)) return fail(res, 429, "rate_limited", "Too many attempts. Try again in an hour.");
  const tok = String((b && b.token) || ""), key = /^[0-9a-f]{64}$/.test(tok) ? sha(tok) : null, v = key ? db.verifies[key] : null, user = v ? db.users[v.userId] : null;
  if (!v || v.expires < Date.now() || !user) { if (key) delete db.verifies[key]; return fail(res, 400, "invalid_argument", "This confirmation link has expired or has already been used. Sign in and we'll send you a new one."); }
  for (const [k, x] of Object.entries(db.verifies)) if (x.userId === user.id) delete db.verifies[k];
  user.emailVerified = true; user.verifiedAt = Date.now(); persist();
  return send(res, 200, { ok: true, email: user.email });
}
function resendVerification(req, res, me) {
  if (!me.user) return fail(res, 401, "auth_required", "Sign in first.");
  if (!needsVerify(me.user)) return send(res, 200, { ok: true, already: true });
  if (tooMany("verify-send|" + me.user.id, 3, 3600e3)) return fail(res, 429, "rate_limited", "We've already sent several emails. Check your spam folder, or try again in an hour.");
  if (!queueVerification(req, me.user)) return fail(res, 503, "unavailable", "Confirmation emails can't be sent right now.");
  return send(res, 200, { ok: true });
}
async function forgotPassword(req, res, ip) {
  const b = await readBody(req, 5_000);
  const email = String((b && b.email) || "").trim().toLowerCase();
  if (!EMAIL_RX.test(email) || email.length > 160) return fail(res, 400, "invalid_argument", "Enter a valid email address.");
  if (!RESEND_KEY) return fail(res, 503, "unavailable", "Password reset emails aren't switched on yet. Use Continue with Google, or contact the site owner.");
  const base = trustedBase(req);
  if (!base) return fail(res, 503, "unavailable", "Password reset isn't configured on this server (set PUBLIC_URL).");
  if (tooMany("forgot-ip|" + ip, 10, 3600e3)) return fail(res, 429, "rate_limited", "Too many reset requests. Try again in an hour.");
  const user = findByEmail(email);
  // Same answer whether or not the account exists, and the email is sent in the background,
  // so this form can't be used to discover who has an account.
  if (user && !tooMany("forgot|" + email, 3, 3600e3)) {
    for (const [k, v] of Object.entries(db.resets)) if (v.userId === user.id) delete db.resets[k];
    const tok = randomBytes(32).toString("hex");
    db.resets[sha(tok)] = { userId: user.id, createdAt: Date.now(), expires: Date.now() + RESET_MINUTES * 60e3 };
    persist();
    const m = resetEmail(user, `${base}/?reset=${tok}#signin`);
    sendEmail(user.email, "Reset your Afrimetrica password", m.html, m.text).catch((e) => console.error("Password reset email failed:", e.message));
  }
  return send(res, 200, { ok: true });
}
async function resetPassword(req, res, me, ip) {
  const b = await readBody(req, 5_000);
  if (tooMany("reset-ip|" + ip, 20, 3600e3)) return fail(res, 429, "rate_limited", "Too many attempts. Try again in an hour.");
  const tok = String((b && b.token) || ""), pw = String((b && b.password) || "");
  const key = /^[0-9a-f]{64}$/.test(tok) ? sha(tok) : null, r = key ? db.resets[key] : null, user = r ? db.users[r.userId] : null;
  if (!r || r.expires < Date.now() || !user) { if (key) delete db.resets[key]; return fail(res, 400, "invalid_argument", "This reset link has expired or has already been used. Ask for a new one."); }
  if (pw.length < 8 || pw.length > 200) return fail(res, 400, "invalid_argument", "Use a password of at least 8 characters.");
  delete db.resets[key];
  user.emailVerified = true; // the reset link proved they own the address
  user.salt = randomBytes(16).toString("hex"); user.passHash = await hashPassword(pw, user.salt); user.passwordChangedAt = Date.now();
  for (const [k, v] of Object.entries(db.sessions)) if (v.userId === user.id) delete db.sessions[k]; // sign out everywhere else
  startSession(req, res, user); claim(me.anon, user.id);
  return send(res, 200, { user: publicUser(user) });
}

// ---------- Google sign-in (OAuth 2.0 authorization code flow) ----------
const oauthStates = new Map();
const baseUrl = (req) => PUBLIC_URL || `${isHttps(req) ? "https" : "http"}://${req.headers.host}`;
const redirect = (res, to) => { res.writeHead(302, { Location: to, "Cache-Control": "no-store" }); res.end(); };
function googleStart(req, res, url) {
  if (!GOOGLE_ID || !GOOGLE_SECRET) return redirect(res, "/?auth_error=google_off#signin");
  const state = randomBytes(16).toString("hex"), nxt = /^[a-z-]{1,30}$/.test(url.searchParams.get("next") || "") ? url.searchParams.get("next") : "studies";
  oauthStates.set(state, { next: nxt, exp: Date.now() + 10 * 60e3 });
  for (const [k, v] of oauthStates) if (v.exp < Date.now()) oauthStates.delete(k);
  addCookie(res, cookieStr(req, "ss_oauth", state, 600, "/auth"));
  const q = new URLSearchParams({ client_id: GOOGLE_ID, redirect_uri: baseUrl(req) + "/auth/google/callback", response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
  return redirect(res, `${GOOGLE_AUTH_URL}?${q}`);
}
async function googleCallback(req, res, url) {
  const state = url.searchParams.get("state") || "", code = url.searchParams.get("code") || "", saved = oauthStates.get(state);
  if (!saved || saved.exp < Date.now() || cookies(req).ss_oauth !== state || !code) return redirect(res, "/?auth_error=google_failed#signin");
  oauthStates.delete(state);
  addCookie(res, cookieStr(req, "ss_oauth", "", 0, "/auth"));
  try {
    const r = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: GOOGLE_ID, client_secret: GOOGLE_SECRET, redirect_uri: baseUrl(req) + "/auth/google/callback", grant_type: "authorization_code" }) });
    const tok = await r.json();
    if (!r.ok || !tok.id_token) throw new Error("token exchange failed: " + r.status);
    // The ID token came straight from Google's token endpoint over HTTPS with our client secret, so its claims can be read directly.
    const claims = JSON.parse(Buffer.from(String(tok.id_token).split(".")[1], "base64url").toString("utf8"));
    if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss) || claims.aud !== GOOGLE_ID || claims.exp * 1000 < Date.now()) throw new Error("bad id token");
    if (claims.email_verified !== true && claims.email_verified !== "true") return redirect(res, "/?auth_error=google_email#signin");
    const email = String(claims.email || "").toLowerCase();
    let user = Object.values(db.users).find((u) => u.googleSub === claims.sub) || findByEmail(email);
    if (user) { user.googleSub = claims.sub; user.emailVerified = true; if (!user.name && claims.name) user.name = String(claims.name).slice(0, 80); }
    else { user = { id: "u_" + randomBytes(12).toString("hex"), email, name: String(claims.name || "").slice(0, 80), googleSub: claims.sub, emailVerified: true, createdAt: Date.now() }; db.users[user.id] = user; }
    startSession(req, res, user);
    return redirect(res, `/?auth=google#${saved.next}`);
  } catch (e) {
    console.error("Google sign-in error", e.message);
    return redirect(res, "/?auth_error=google_failed#signin");
  }
}

// ---------- helpers ----------
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const fail = (res, status, code, message, extra = {}) => send(res, status, { code, message, ...extra });
function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { if (!chunks.length) return resolve(undefined); try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (e) { reject(Object.assign(new Error("bad json"), { status: 400 })); } });
    req.on("error", reject);
  });
}
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const okId = (s) => typeof s === "string" && /^[A-Za-z0-9_.~:@+-]{1,120}$/.test(s);
const usedSlots = (sid) => Object.values(db.responses).filter((r) => r.studyId === sid && r.status !== "rejected").length;
const stub = (r) => ({ id: "h" + sha(r.id).slice(0, 16), studyId: r.studyId, status: r.status });
// What a site administrator sees of other people's responses: counts, rewards and dates for the business view,
// never the answers, demographics or the participant's account id.
const adminStub = (r) => ({ ...stub(r), reward: r.reward, test: !!r.test, createdAt: r.createdAt, participantId: "p_" + sha(String(r.participantId)).slice(0, 12) });
const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
const ENQUIRY_TYPES = ["analytics", "consultancy", "contact", "training"];
const ENQUIRY_STATUS = ["new", "contacted", "in_progress", "won", "closed"];
const ENROL_STATUS = ["registered", "interest", "confirmed", "attended", "completed", "cancelled"];
// Email the site owners (ADMIN_EMAILS) about new enquiries and registrations, when Resend is configured.
function notifyAdmins(req, subject, paragraphs) {
  const base = trustedBase(req);
  if (!RESEND_KEY || !ADMIN_EMAILS.length || !base) return;
  const m = brandEmail({ name: "" }, { paragraphs, button: "Open the admin area", link: `${base}/#business`, footer: "You're getting this because your address is listed in ADMIN_EMAILS." });
  for (const to of ADMIN_EMAILS) sendEmail(to, subject, m.html, m.text).catch((e) => console.error("Admin notification failed:", e.message));
}
function cleanCourse(b, id, cur) {
  const sessions = (Array.isArray(b.sessions) ? b.sessions : []).slice(0, 50).map((x) => ({
    id: okId(x && x.id) ? x.id : "ss" + randomBytes(5).toString("hex"),
    start: /^\d{4}-\d{2}-\d{2}$/.test((x && x.start) || "") ? x.start : "", end: /^\d{4}-\d{2}-\d{2}$/.test((x && x.end) || "") ? x.end : "",
    location: clip(x && x.location, 120), seats: Math.max(0, Math.min(10000, Math.floor(+(x && x.seats) || 0))),
    fee: Math.max(0, Math.min(1e7, +(x && x.fee) || 0)), currency: ["USD", "GHS", "GBP", "EUR"].includes(x && x.currency) ? x.currency : "USD",
  }));
  return { id, title: clip(b.title, 150), status: b.status === "published" ? "published" : "draft", level: clip(b.level, 40), format: clip(b.format, 40),
    duration: clip(b.duration, 80), summary: clip(b.summary, 400), description: clip(b.description, 6000), audience: clip(b.audience, 400),
    outcomes: (Array.isArray(b.outcomes) ? b.outcomes : []).slice(0, 20).map((o) => clip(o, 200)).filter(Boolean), certificate: !!b.certificate,
    sessions, createdAt: cur ? cur.createdAt : Date.now(), updatedAt: Date.now() };
}

// ---------- AI ----------
const hits = new Map();
function allowAI(key) {
  const now = Date.now(), list = (hits.get(key) || []).filter((t) => now - t < 3600e3);
  if (list.length >= AI_LIMIT) { hits.set(key, list); return false; }
  list.push(now); hits.set(key, list); return true;
}
function toMessages(input) {
  const raw = typeof input === "string" ? [{ role: "user", content: input }] : Array.isArray(input) ? input : [];
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content; else out.push({ role: m.role, content: m.content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out.length && out[out.length - 1].role === "user" ? out : null;
}
function parseJsonLoose(text) {
  try { return { ok: true, value: JSON.parse(text) }; } catch (e) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return { ok: true, value: JSON.parse(fence[1]) }; } catch (e) {} }
  const a = text.search(/[\[{]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (a >= 0 && b > a) { try { return { ok: true, value: JSON.parse(text.slice(a, b + 1)) }; } catch (e) {} }
  return { ok: false };
}
async function runClaude(params, signal) {
  // Server-side refusal fallback is on by default; if this account or SDK version rejects it, retry once without.
  try {
    return await client.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }, { signal }).finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError && /fallback/i.test(String(e.message))) return await client.messages.stream(params, { signal }).finalMessage();
    throw e;
  }
}
async function handleAI(req, res, me) {
  if (!me.user) return fail(res, 401, "auth_required", "Sign in to use the AI features.");
  if (needsVerify(me.user)) return fail(res, 403, "verify_required", `Confirm your email address first. We sent a link to ${me.user.email}.`);
  if (!client) return fail(res, 503, "sampling_disabled", "AI is not configured on this server.");
  if (!allowAI(me.uid || req.socket.remoteAddress)) return fail(res, 429, "rate_limited", "Too many AI requests. Try again later.");
  const body = await readBody(req, 600_000);
  const messages = toMessages(body && body.input);
  if (!messages) return fail(res, 400, "invalid_request", "Send a prompt string or a list of turns ending with a user turn.");
  const json = body.mode === "json";
  const effort = { quick: "low", default: "medium", complex: "high" }[body.tier] || "medium";
  const ctl = new AbortController();
  res.on("close", () => { if (!res.writableEnded) ctl.abort(); });
  try {
    const msg = await runClaude({
      model: MODEL, max_tokens: 32000,
      output_config: { effort },
      system: "You are the AI assistant inside Afrimetrica, a research methods, surveys and analytics platform. Follow the instructions in the user's message exactly." + (json ? " Reply with only valid JSON and no other text." : ""),
      messages,
    }, ctl.signal);
    if (msg.stop_reason === "refusal") return fail(res, 422, "refused", "Claude declined this request.");
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (!text) return fail(res, 502, "empty_completion", "No answer was produced.");
    if (!json) return send(res, 200, { text, truncated: msg.stop_reason === "max_tokens" });
    const parsed = parseJsonLoose(text);
    return parsed.ok ? send(res, 200, { value: parsed.value }) : fail(res, 422, "invalid_json", "The answer was not valid JSON.", { text });
  } catch (e) {
    if (ctl.signal.aborted) return;
    if (e instanceof Anthropic.RateLimitError) return fail(res, 429, "rate_limited", "The AI service is busy. Try again shortly.");
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return fail(res, 503, "sampling_disabled", "The server's Anthropic API key was rejected.");
    if (e instanceof Anthropic.BadRequestError) return fail(res, 400, "invalid_request", "The AI request was not accepted.");
    console.error("AI error", e);
    return fail(res, 502, "upstream_error", "The AI service could not be reached.");
  }
}

// ---------- API routes ----------
async function handleApi(req, res, url) {
  const me = who(req), seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent); // ["api", kind, id?]
  const kind = seg[1], id = seg[2], m = req.method;
  if (kind === "ai" && m === "POST") return handleAI(req, res, me);
  if (kind === "auth" && m === "POST") return handleAuth(req, res, me, id);
  if (!me.uid) return fail(res, 401, "invalid_argument", "Missing or malformed client token.");
  const needUser = () => fail(res, 401, "auth_required", "Sign in or create a free account to continue.");
  const uid = me.uid;

  if (kind === "me" && m === "GET") return send(res, 200, { uid, user: publicUser(me.user), isAdmin: me.isAdmin, ai: !!client, google: !!(GOOGLE_ID && GOOGLE_SECRET), emailReset: !!RESEND_KEY, notify: me.isAdmin ? !!(RESEND_KEY && ADMIN_EMAILS.length) : undefined });

  if (kind === "data" && m === "GET") {
    const studies = Object.values(db.studies).filter((s) => s.status !== "draft" || s.ownerId === uid || me.isAdmin);
    const mine = new Set(Object.values(db.studies).filter((s) => s.ownerId === uid).map((s) => s.id));
    const responses = Object.values(db.responses).map((r) => (mine.has(r.studyId) || r.participantId === uid ? r : me.isAdmin ? adminStub(r) : stub(r)));
    const actions = Object.values(db.actions).filter((a) => me.isAdmin || a.ownerId === uid);
    const fieldwork = Object.values(db.fieldwork).filter((f) => me.isAdmin || f.requesterId === uid);
    const live = Object.values(db.enrollments).filter((e) => e.status !== "cancelled");
    const courses = Object.values(db.courses).filter((c) => c.status === "published" || me.isAdmin)
      .map((c) => ({ ...c, sessions: (c.sessions || []).map((s) => ({ ...s, taken: live.filter((e) => e.courseId === c.id && e.sessionId === s.id).length })) }));
    const enrollments = Object.values(db.enrollments).filter((x) => me.isAdmin || x.userId === uid);
    const enquiries = Object.values(db.enquiries).filter((x) => me.isAdmin || x.requesterId === uid);
    return send(res, 200, { studies, responses, actions, fieldwork, courses, enrollments, enquiries, settings: db.settings || {}, profile: db.profiles[uid] || null, ai: !!client });
  }

  if (kind === "studies" && okId(id)) {
    if (!me.user && !me.isAdmin) return needUser();
    const cur = db.studies[id];
    if (cur && cur.ownerId !== uid && !me.isAdmin) return fail(res, 403, "invalid_argument", "Only the survey's owner can change it.");
    if (m === "DELETE") { delete db.studies[id]; persist(); return send(res, 204); }
    if (m === "PUT") {
      const b = await readBody(req, 400_000);
      if (!isObj(b) || !Array.isArray(b.questions) || b.questions.length > 300 || typeof b.title !== "string") return fail(res, 400, "invalid_argument", "That isn't a valid survey.");
      if (b.status === "live" && (!cur || cur.status !== "live") && needsVerify(me.user)) return fail(res, 403, "verify_required", `Confirm your email address before launching. We sent a link to ${me.user.email}.`);
      db.studies[id] = { ...b, id, ownerId: cur ? cur.ownerId : uid, updatedAt: Date.now() };
      persist(); return send(res, 200, { ok: true });
    }
  }

  if (kind === "responses" && okId(id)) {
    if (!me.user && !me.isAdmin) return needUser();
    const cur = db.responses[id];
    if (m === "PUT") {
      const b = await readBody(req, 200_000), st = isObj(b) ? db.studies[b.studyId] : null;
      if (needsVerify(me.user)) return fail(res, 403, "verify_required", `Confirm your email address before taking paid surveys. We sent a link to ${me.user.email}.`);
      if (!st || id !== `${st.id}-${uid}` || !isObj(b.answers)) return fail(res, 400, "invalid_argument", "That isn't a valid response.");
      if (cur || Object.values(db.responses).some((r) => r.studyId === st.id && r.participantId === uid)) return fail(res, 409, "invalid_argument", "You have already taken this survey.");
      if (st.status !== "live") return fail(res, 409, "invalid_argument", "This survey is closed.");
      if (usedSlots(st.id) >= st.target) return fail(res, 409, "invalid_argument", "This survey is full.");
      const status = b.passedAttention !== false && !b.speeder ? "approved" : "flagged";
      db.responses[id] = { ...b, id, participantId: uid, ownerId: st.ownerId, reward: st.reward, status, test: st.ownerId === uid, createdAt: Date.now() };
      persist(); return send(res, 200, { ok: true });
    }
    if (m === "PATCH") {
      const b = await readBody(req, 10_000);
      if (!cur) return fail(res, 404, "invalid_argument", "Response not found.");
      const st = db.studies[cur.studyId];
      if (!me.isAdmin && (!st || st.ownerId !== uid)) return fail(res, 403, "invalid_argument", "Only the survey's owner can review responses.");
      if (!isObj(b) || !["approved", "rejected", "flagged"].includes(b.status)) return fail(res, 400, "invalid_argument", "Status must be approved, rejected or flagged.");
      cur.status = b.status; persist(); return send(res, 200, { ok: true });
    }
  }

  if (kind === "actions" && okId(id)) {
    if (!me.user && !me.isAdmin) return needUser();
    const cur = db.actions[id];
    if (cur && cur.ownerId !== uid && !me.isAdmin) return fail(res, 403, "invalid_argument", "Only the action's owner can change it.");
    if (m === "DELETE") { delete db.actions[id]; persist(); return send(res, 204); }
    if (m === "PUT") {
      const b = await readBody(req, 50_000), st = isObj(b) ? db.studies[b.studyId] : null;
      if (!st || (st.ownerId !== uid && !me.isAdmin) || typeof b.title !== "string") return fail(res, 400, "invalid_argument", "Actions can only be added to your own surveys.");
      db.actions[id] = { ...b, id, ownerId: cur ? cur.ownerId : uid, updatedAt: Date.now() };
      persist(); return send(res, 200, { ok: true });
    }
  }

  if (kind === "fieldwork" && okId(id)) {
    const cur = db.fieldwork[id];
    if (m === "PUT") {
      if (cur) return fail(res, 409, "invalid_argument", "This request was already sent.");
      const b = await readBody(req, 200_000), c = isObj(b) ? b.contact : null;
      if (!isObj(c) || typeof c.name !== "string" || !c.name.trim() || typeof c.email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email) || !isObj(b.quote) || !isObj(b.inputs)) return fail(res, 400, "invalid_argument", "Add your name, a valid email address and a quote.");
      const mine = Object.values(db.fieldwork).filter((f) => f.requesterId === uid && Date.now() - f.createdAt < 864e5).length;
      if (mine >= 20) return fail(res, 429, "rate_limited", "Too many requests today. Please contact us directly.");
      const clip = (v, n) => String(v || "").slice(0, n);
      db.fieldwork[id] = { id, ref: clip(b.ref, 20), requesterId: uid, status: "new", createdAt: Date.now(),
        contact: { name: clip(c.name, 80), org: clip(c.org, 120), email: clip(c.email, 160), phone: clip(c.phone, 40), start: clip(c.start, 10), notes: clip(c.notes, 1200) },
        inputs: b.inputs, survey: isObj(b.survey) ? b.survey : null, quote: b.quote };
      persist();
      notifyAdmins(req, `New paper survey request from ${db.fieldwork[id].contact.name}`, [`${db.fieldwork[id].contact.name} (${db.fieldwork[id].contact.email}) requested fieldwork. Quote ${db.fieldwork[id].ref}: US$${Math.round(+(b.quote && b.quote.total) || 0).toLocaleString("en-US")}.`]);
      return send(res, 200, { ok: true });
    }
    if (m === "PATCH") {
      if (!me.isAdmin) return fail(res, 403, "invalid_argument", "Only the site owner can update requests.");
      if (!cur) return fail(res, 404, "invalid_argument", "Request not found.");
      const b = await readBody(req, 5_000);
      if (!isObj(b) || !["new", "contacted", "quoted", "won", "lost"].includes(b.status)) return fail(res, 400, "invalid_argument", "Unknown status.");
      cur.status = b.status; persist(); return send(res, 200, { ok: true });
    }
  }

  // ---- Afrimetrica Academy: courses (site owners manage) and registrations ----
  if (kind === "courses" && okId(id)) {
    if (!me.isAdmin) return fail(res, 403, "invalid_argument", "Only site administrators can manage courses.");
    if (m === "DELETE") { delete db.courses[id]; persist(); return send(res, 204); }
    if (m === "PUT") {
      const b = await readBody(req, 100_000);
      if (!isObj(b) || !String(b.title || "").trim()) return fail(res, 400, "invalid_argument", "Give the course a title.");
      db.courses[id] = cleanCourse(b, id, db.courses[id]); persist(); return send(res, 200, { ok: true });
    }
  }
  if (kind === "enrollments" && okId(id)) {
    const cur = db.enrollments[id];
    if (m === "PUT") {
      if (!me.user) return needUser();
      if (needsVerify(me.user)) return fail(res, 403, "verify_required", `Confirm your email address before registering. We sent a link to ${me.user.email}.`);
      if (cur) return fail(res, 409, "invalid_argument", "This registration already exists.");
      const b = await readBody(req, 20_000), course = isObj(b) ? db.courses[b.courseId] : null;
      if (!course || course.status !== "published") return fail(res, 400, "invalid_argument", "That course isn't open for registration.");
      const session = b.sessionId ? course.sessions.find((x) => x.id === b.sessionId) : null;
      if (b.sessionId && !session) return fail(res, 400, "invalid_argument", "That session no longer exists.");
      if (Object.values(db.enrollments).some((x) => x.userId === uid && x.courseId === course.id && (x.sessionId || "") === (b.sessionId || "") && x.status !== "cancelled")) return fail(res, 409, "invalid_argument", "You're already registered for this.");
      if (session && session.seats > 0 && Object.values(db.enrollments).filter((x) => x.sessionId === session.id && x.status !== "cancelled").length >= session.seats) return fail(res, 409, "invalid_argument", "Sorry, this session is full.");
      db.enrollments[id] = { id, userId: uid, courseId: course.id, sessionId: session ? session.id : "", status: session ? "registered" : "interest",
        name: clip(b.name || me.user.name, 80), email: me.user.email, phone: clip(b.phone, 40), organisation: clip(b.organisation, 120), notes: clip(b.notes, 1000), createdAt: Date.now() };
      persist();
      notifyAdmins(req, `New ${session ? "course registration" : "course interest"}: ${course.title}`, [`${db.enrollments[id].name || me.user.email} (${me.user.email}) ${session ? `registered for ${course.title}, session starting ${session.start || "date to be confirmed"}` : `registered interest in ${course.title}`}.`]);
      return send(res, 200, { ok: true });
    }
    if (m === "PATCH") {
      if (!cur) return fail(res, 404, "invalid_argument", "Registration not found.");
      const b = await readBody(req, 5_000), st = isObj(b) ? b.status : "";
      if (!ENROL_STATUS.includes(st)) return fail(res, 400, "invalid_argument", "Unknown status.");
      if (!me.isAdmin && !(cur.userId === uid && st === "cancelled")) return fail(res, 403, "invalid_argument", "You can only cancel your own registration.");
      cur.status = st; cur.updatedAt = Date.now(); persist(); return send(res, 200, { ok: true });
    }
  }
  // ---- Analytics, consultancy, training and general enquiries (no account needed) ----
  if (kind === "enquiries" && okId(id)) {
    const cur = db.enquiries[id];
    if (m === "PUT") {
      if (cur) return fail(res, 409, "invalid_argument", "This enquiry was already sent.");
      const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      if (tooMany("enquiry-ip|" + ip, 10, 3600e3)) return fail(res, 429, "rate_limited", "Too many enquiries from this connection. Please try again later.");
      const b = await readBody(req, 50_000), c = isObj(b) ? b.contact : null;
      if (!isObj(c) || !String(c.name || "").trim() || !EMAIL_RX.test(String(c.email || "").trim())) return fail(res, 400, "invalid_argument", "Add your name and a valid email address.");
      if (!ENQUIRY_TYPES.includes(b.type) || String(b.message || "").trim().length < 5) return fail(res, 400, "invalid_argument", "Tell us a little about what you need.");
      const d = isObj(b.details) ? b.details : {};
      db.enquiries[id] = { id, type: b.type, requesterId: uid, status: "new", createdAt: Date.now(),
        contact: { name: clip(c.name, 80), email: clip(String(c.email).trim().toLowerCase(), 160), phone: clip(c.phone, 40), organisation: clip(c.organisation, 120) },
        subject: clip(b.subject, 160), message: clip(b.message, 4000), details: { service: clip(d.service, 120), timeline: clip(d.timeline, 80), budget: clip(d.budget, 80) } };
      persist();
      const q = db.enquiries[id];
      notifyAdmins(req, `New ${q.type} enquiry from ${q.contact.name}`, [`${q.contact.name} (${q.contact.email}${q.contact.organisation ? ", " + q.contact.organisation : ""}) sent a ${q.type} enquiry${q.details.service ? " about " + q.details.service : ""}.`, q.message.slice(0, 600)]);
      return send(res, 200, { ok: true });
    }
    if (m === "PATCH") {
      if (!me.isAdmin) return fail(res, 403, "invalid_argument", "Only site administrators can update enquiries.");
      if (!cur) return fail(res, 404, "invalid_argument", "Enquiry not found.");
      const b = await readBody(req, 5_000);
      if (!isObj(b) || !ENQUIRY_STATUS.includes(b.status)) return fail(res, 400, "invalid_argument", "Unknown status.");
      cur.status = b.status; persist(); return send(res, 200, { ok: true });
    }
  }
  // ---- Site settings shown on the Contact page ----
  if (kind === "settings" && m === "PUT") {
    if (!me.isAdmin) return fail(res, 403, "invalid_argument", "Only site administrators can change settings.");
    const b = await readBody(req, 10_000);
    if (!isObj(b)) return fail(res, 400, "invalid_argument", "Invalid settings.");
    const web = String(b.linkedin || "").trim();
    db.settings = { email: clip(b.email, 160), phone: clip(b.phone, 40), whatsapp: clip(b.whatsapp, 40), address: clip(b.address, 400), hours: clip(b.hours, 160),
      linkedin: /^https:\/\/[^\s]+$/.test(web) ? clip(web, 300) : "", updatedAt: Date.now() };
    persist(); return send(res, 200, { ok: true });
  }

  if (kind === "profile" && m === "PUT") {
    if (!me.user) return needUser();
    const b = await readBody(req, 5_000);
    if (!isObj(b) || !(b.age >= 18 && b.age <= 120)) return fail(res, 400, "invalid_argument", "That isn't a valid profile.");
    db.profiles[uid] = { age: Math.floor(b.age), gender: String(b.gender || "").slice(0, 40), country: String(b.country || "").slice(0, 60), occupation: String(b.occupation || "").slice(0, 60), updatedAt: Date.now() };
    persist(); return send(res, 200, { ok: true });
  }
  return fail(res, 404, "not_found", "Unknown API route.");
}

// ---------- server ----------
const SECURITY = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "SAMEORIGIN" };
export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    for (const [k, v] of Object.entries(SECURITY)) res.setHeader(k, v);
    const host = String(req.headers.host || "").toLowerCase();
    if (CANONICAL && host && host !== CANONICAL.host && url.pathname !== "/healthz" && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
      res.writeHead(req.method === "GET" || req.method === "HEAD" ? 301 : 308, { Location: CANONICAL.origin + req.url });
      return res.end();
    }
    if (req.method !== "GET" && req.method !== "HEAD" && req.headers.origin) {
      let sameSite = false; try { sameSite = new URL(req.headers.origin).host === req.headers.host; } catch (e) {}
      if (!sameSite) return fail(res, 403, "invalid_argument", "Cross-site request refused.");
    }
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (url.pathname === "/auth/google" && req.method === "GET") return googleStart(req, res, url);
    if (url.pathname === "/auth/google/callback" && req.method === "GET") return await googleCallback(req, res, url);
    if (url.pathname === "/healthz") return send(res, 200, { ok: true });
    if (url.pathname.startsWith("/photos/") && PHOTOS.has(url.pathname.slice(8))) { res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" }); return res.end(PHOTOS.get(url.pathname.slice(8))); }
    if (req.method === "GET" && url.pathname === "/robots.txt") { res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" }); return res.end(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\n\nSitemap: ${baseUrl(req)}/sitemap.xml\n`); }
    if (req.method === "GET" && url.pathname === "/sitemap.xml") { const b = baseUrl(req); res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }); return res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...PAGES.keys()].map((p) => `<url><loc>${attr(b + p)}</loc></url>`).join("\n")}\n</urlset>\n`); }
    if (url.pathname === "/social.jpg" && SOCIAL) { res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" }); return res.end(SOCIAL); }
    if (url.pathname === "/icon.svg") { res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" }); return res.end(ICON); }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }); return res.end(pageHtml(PAGES.get("/") || { path: "/" }, baseUrl(req), true)); }
    if (req.method === "GET" && url.pathname.length > 1 && url.pathname.endsWith("/") && PAGES.has(url.pathname.replace(/\/+$/, ""))) { res.writeHead(301, { Location: url.pathname.replace(/\/+$/, "") + url.search }); return res.end(); }
    if (req.method === "GET" && PUBLIC_SECTIONS.test(url.pathname)) {
      // A public page: known ones are listed for search engines; others still open in the app but aren't indexed.
      const known = PAGES.has(url.pathname);
      res.writeHead(known ? 200 : 404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      return res.end(pageHtml(known ? PAGES.get(url.pathname) : { path: url.pathname }, baseUrl(req), known));
    }
    res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found");
  } catch (e) {
    if (e && e.status) return fail(res, e.status, e.status === 413 ? "quota_exceeded" : "invalid_argument", e.message);
    console.error(e); if (!res.headersSent) fail(res, 500, "unavailable", "Server error.");
  }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Afrimetrica running on port ${PORT}. AI ${client ? "on (" + MODEL + ")" : "off: set ANTHROPIC_API_KEY"}. Google sign-in ${GOOGLE_ID && GOOGLE_SECRET ? "on" : "off"}. Reset emails ${RESEND_KEY ? "on (from " + EMAIL_FROM + ")" : "off: set RESEND_API_KEY"}. Data in ${DATA_DIR}.`));
}
