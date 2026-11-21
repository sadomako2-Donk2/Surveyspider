// Imports Phase 1's store.json into the database in DATABASE_URL.
//
//   npm run db:import-phase1 -- /path/to/store.json                     dry run: report only, nothing saved
//   npm run db:import-phase1 -- /path/to/store.json --apply             import
//   npm run db:import-phase1 -- /path/to/store.json --report out.json   also write the report as JSON
//
// Test on a copy first (see docs/migration.md). Safe to run more than once.
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { createPrisma } from "../src/lib/db";
import { formatReport, importPhase1 } from "./phase1/import-lib";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--report");
  const apply = args.includes("--apply");
  const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : undefined;
  if (!file) throw new Error("Give the path to Phase 1's store.json, e.g. npm run db:import-phase1 -- ./store.json");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const target = new URL(url);
  console.log(
    `${apply ? "Importing" : "Dry run"}: ${file} -> database "${target.pathname.slice(1)}" on ${target.hostname}`,
  );
  const store = JSON.parse(readFileSync(file, "utf8")) as unknown;
  const db = createPrisma(url);
  try {
    const report = await importPhase1(db, store, { apply });
    console.log(formatReport(report));
    if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
