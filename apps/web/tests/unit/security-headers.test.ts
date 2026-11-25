import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";
import { clientIp } from "@/server/http";

describe("security headers", () => {
  it("only lets this site's scripts run in production", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("script-src 'self' 'unsafe-inline';");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toMatch(/https?:\/\//); // no outside sources at all
  });
  it("allows hot reloading only in development", () => {
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'");
  });
  it("sends HSTS, permissions and the other headers", () => {
    const h = Object.fromEntries(securityHeaders(false).map((x) => [x.key, x.value]));
    expect(h["Strict-Transport-Security"]).toBe("max-age=31536000");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(h["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://x.test/", { headers });
  it("prefers Cloudflare's address, which visitors can't fake", () => {
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4" }))).toBe("203.0.113.7");
  });
  it("falls back to the forwarded address, and ignores a malformed Cloudflare header", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(req({ "cf-connecting-ip": "<script>", "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
