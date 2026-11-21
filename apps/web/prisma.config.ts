import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL comes from apps/web/.env locally (see .env.example) and from Render in production.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
