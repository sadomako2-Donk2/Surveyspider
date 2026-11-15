// SurveySpider server for Render (or any Node 20+ host).
// Serves the single-page app, stores shared data in a JSON file, enforces who may change what,
// and calls Claude for the AI features with the server's own ANTHROPIC_API_KEY.
import http from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { createHash, timingSafeEqual } from "node:crypto";
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

// ---------- page ----------
const SHELL_HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" type="image/svg+xml" href="/icon.svg"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`;
const PAGE = SHELL_HEAD + readFileSync(path.join(here, "public", "index.html"), "utf8") + "</body></html>";
const ICON = readFileSync(path.join(here, "public", "icon.svg"));

// ---------- storage ----------
mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, "store.json");
let db = { studies: {}, responses: {}, actions: {}, profiles: {}, fieldwork: {} };
if (existsSync(FILE)) { try { db = { ...db, ...JSON.parse(readFileSync(FILE, "utf8")) }; } catch (e) { console.error("Could not read store.json; starting empty.", e); } }
let saveTimer = null;
function flush() { const tmp = FILE + ".tmp"; writeFileSync(tmp, JSON.stringify(db)); renameSync(tmp, FILE); }
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 250); }
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => { clearTimeout(saveTimer); try { flush(); } catch (e) {} process.exit(0); });

// ---------- identity ----------
const sha = (s) => createHash("sha256").update(s).digest("hex");
function who(req) {
  const t = String(req.headers["x-client-token"] || "");
  const uid = /^[0-9a-f]{48}$/.test(t) ? "c_" + sha(t).slice(0, 24) : null;
  const code = String(req.headers["x-admin-code"] || "");
  const isAdmin = !!ADMIN_CODE && code.length === ADMIN_CODE.length && timingSafeEqual(Buffer.from(code), Buffer.from(ADMIN_CODE));
  return { uid, isAdmin };
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
      system: "You are the AI assistant inside SurveySpider, a survey and research platform. Follow the instructions in the user's message exactly." + (json ? " Reply with only valid JSON and no other text." : ""),
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
  if (!me.uid) return fail(res, 401, "invalid_argument", "Missing or malformed client token.");
  const uid = me.uid;

  if (kind === "me" && m === "GET") return send(res, 200, { uid, isAdmin: me.isAdmin, ai: !!client });

  if (kind === "data" && m === "GET") {
    const studies = Object.values(db.studies).filter((s) => s.status !== "draft" || s.ownerId === uid || me.isAdmin);
    const mine = new Set(Object.values(db.studies).filter((s) => s.ownerId === uid).map((s) => s.id));
    const responses = Object.values(db.responses).map((r) => (me.isAdmin || mine.has(r.studyId) || r.participantId === uid ? r : stub(r)));
    const actions = Object.values(db.actions).filter((a) => me.isAdmin || a.ownerId === uid);
    const fieldwork = Object.values(db.fieldwork).filter((f) => me.isAdmin || f.requesterId === uid);
    return send(res, 200, { studies, responses, actions, fieldwork, profile: db.profiles[uid] || null });
  }

  if (kind === "studies" && okId(id)) {
    const cur = db.studies[id];
    if (cur && cur.ownerId !== uid && !me.isAdmin) return fail(res, 403, "invalid_argument", "Only the survey's owner can change it.");
    if (m === "DELETE") { delete db.studies[id]; persist(); return send(res, 204); }
    if (m === "PUT") {
      const b = await readBody(req, 400_000);
      if (!isObj(b) || !Array.isArray(b.questions) || b.questions.length > 300 || typeof b.title !== "string") return fail(res, 400, "invalid_argument", "That isn't a valid survey.");
      db.studies[id] = { ...b, id, ownerId: cur ? cur.ownerId : uid, updatedAt: Date.now() };
      persist(); return send(res, 200, { ok: true });
    }
  }

  if (kind === "responses" && okId(id)) {
    const cur = db.responses[id];
    if (m === "PUT") {
      const b = await readBody(req, 200_000), st = isObj(b) ? db.studies[b.studyId] : null;
      if (!st || id !== `${st.id}-${uid}` || !isObj(b.answers)) return fail(res, 400, "invalid_argument", "That isn't a valid response.");
      if (cur) return fail(res, 409, "invalid_argument", "You have already taken this survey.");
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
      persist(); return send(res, 200, { ok: true });
    }
    if (m === "PATCH") {
      if (!me.isAdmin) return fail(res, 403, "invalid_argument", "Only the site owner can update requests.");
      if (!cur) return fail(res, 404, "invalid_argument", "Request not found.");
      const b = await readBody(req, 5_000);
      if (!isObj(b) || !["new", "contacted", "quoted", "won", "lost"].includes(b.status)) return fail(res, 400, "invalid_argument", "Unknown status.");
      cur.status = b.status; persist(); return send(res, 200, { ok: true });
    }
  }

  if (kind === "profile" && m === "PUT") {
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
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (url.pathname === "/healthz") return send(res, 200, { ok: true });
    if (url.pathname === "/icon.svg") { res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" }); return res.end(ICON); }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }); return res.end(PAGE); }
    res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found");
  } catch (e) {
    if (e && e.status) return fail(res, e.status, e.status === 413 ? "quota_exceeded" : "invalid_argument", e.message);
    console.error(e); if (!res.headersSent) fail(res, 500, "unavailable", "Server error.");
  }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`SurveySpider running on port ${PORT}. AI ${client ? "on (" + MODEL + ")" : "off: set ANTHROPIC_API_KEY"}. Data in ${DATA_DIR}.`));
}
