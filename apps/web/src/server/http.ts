import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { authConfig } from "./config";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
export const isToken = (t: unknown): t is string => typeof t === "string" && /^[0-9a-f]{64}$/.test(t);
export const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const cleanEmail = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
export const validEmail = (e: string) => EMAIL_RX.test(e) && e.length <= 160;

const NO_STORE = { "Cache-Control": "no-store" };

export function json(status: number, body: unknown, cookies: string[] = []): Response {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", ...NO_STORE });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}
export const fail = (status: number, code: string, message: string) => json(status, { code, message });

export function redirect(to: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: to, ...NO_STORE });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

export class BadRequest extends Error {}

/** Parses a JSON object body, refusing anything larger than `limit` bytes. */
export async function readJson(req: Request, limit = 10_000): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > limit) throw new BadRequest("Request too large.");
  if (!text) return {};
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw new BadRequest("Request body isn't valid JSON.");
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new BadRequest("Request body must be a JSON object.");
  return v as Record<string, unknown>;
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const isHttps = (req: Request) =>
  (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")).split(",")[0]!.trim() ===
  "https";

export function cookie(req: Request, name: string, value: string, maxAgeSeconds: number, path = "/"): string {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isHttps(req) ? "; Secure" : ""}`;
}

export const clientIp = (req: Request) =>
  (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "").split(",")[0]!.trim() || "unknown";

/** Requests that change something must come from our own pages (or from a non-browser client with no Origin). */
export function crossSite(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return false;
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return true;
  }
}

/**
 * The address put in emailed links. Never taken from the request's Host header (which an attacker controls),
 * except for localhost during development.
 */
export function trustedBase(req: Request): string | null {
  const { publicUrl } = authConfig();
  if (publicUrl) return publicUrl;
  const host = req.headers.get("host") ?? "";
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : null;
}

/** Only same-site paths like /account or /training/research-design are allowed as a "next" destination. */
export function safeNext(v: string | null | undefined, fallback = "/account"): string {
  return v && /^\/(?!\/)[a-zA-Z0-9/_-]{0,80}$/.test(v) ? v : fallback;
}
