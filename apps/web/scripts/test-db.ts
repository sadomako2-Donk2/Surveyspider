// Database and auth tests, each run in a fresh throwaway database (see throwaway-db.ts).
import { spawnSync } from "node:child_process";
import { withThrowawayDb } from "./throwaway-db";

withThrowawayDb(
  (url) =>
    spawnSync("npx", ["vitest", "run", "--config", "vitest.db.config.ts", ...process.argv.slice(2)], {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url, TEST_DATABASE_URL: url },
    }).status ?? 1,
)
  .then((status) => process.exit(status))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
