import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // apps/web is its own project (Phase 1 has a separate lockfile at the repository root).
  turbopack: { root: import.meta.dirname },
  // CSP, HSTS and the other security headers on every page and API response (src/lib/security-headers.ts).
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
