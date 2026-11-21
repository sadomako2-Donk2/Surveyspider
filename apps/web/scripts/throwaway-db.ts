// Creates a brand-new database next to TEST_DATABASE_URL's, applies the migrations, runs `fn`, then drops it.
// Nothing that existed before is ever changed or deleted.
import "dotenv/config";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Client } from "pg";

async function admin(base: string, sql: string) {
  const c = new Client({ connectionString: base });
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end();
  }
}

export async function withThrowawayDb(fn: (url: string) => Promise<number> | number): Promise<number> {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) throw new Error("TEST_DATABASE_URL is not set (see .env.example).");
  const name = `afrimetrica_test_run_${randomBytes(4).toString("hex")}`;
  const url = new URL(base);
  url.pathname = `/${name}`;
  await admin(base, `CREATE DATABASE "${name}"`);
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url.toString() } });
    return await fn(url.toString());
  } finally {
    if (/^afrimetrica_test_run_[0-9a-f]{8}$/.test(name))
      await admin(base, `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  }
}
