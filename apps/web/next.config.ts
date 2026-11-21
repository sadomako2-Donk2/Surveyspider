import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // apps/web is its own project (Phase 1 has a separate lockfile at the repository root).
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
