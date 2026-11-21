import { defineConfig } from "vitest/config";
import path from "node:path";

// Database tests: run against TEST_DATABASE_URL, one file at a time.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: { include: ["tests/db/**/*.test.ts"], environment: "node", fileParallelism: false, testTimeout: 20_000 },
});
