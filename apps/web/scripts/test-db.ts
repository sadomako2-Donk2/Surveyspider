// Runs the database tests in a brand-new, throwaway database:
//   1. creates afrimetrica_test_run_<random> next to TEST_DATABASE_URL's database
//   2. applies the migrations to it (prisma migrate deploy)
//   3. runs the tests against it
//   4. drops that database (and only that one)
// Nothing that existed before the run is ever changed or deleted.
import "dotenv/config";
import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Client } from "pg";

const base = process.env.TEST_DATABASE_URL;
if (!base) throw new Error("TEST_DATABASE_URL is not set (see .env.example).");

const runDb = `afrimetrica_test_run_${randomBytes(4).toString("hex")}`;
const runUrl = new URL(base);
runUrl.pathname = `/${runDb}`;

async function admin(sql: string) {
  const c = new Client({ connectionString: base });
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end();
  }
}

async function main() {
  await admin(`CREATE DATABASE "${runDb}"`);
  let status = 1;
  try {
    const env = { ...process.env, DATABASE_URL: runUrl.toString(), TEST_DATABASE_URL: runUrl.toString() };
    execSync("npx prisma migrate deploy", { stdio: "inherit", env });
    const extra = process.argv.slice(2);
    status =
      spawnSync("npx", ["vitest", "run", "--config", "vitest.db.config.ts", ...extra], { stdio: "inherit", env })
        .status ?? 1;
  } finally {
    if (/^afrimetrica_test_run_[0-9a-f]{8}$/.test(runDb))
      await admin(`DROP DATABASE IF EXISTS "${runDb}" WITH (FORCE)`);
  }
  process.exit(status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
