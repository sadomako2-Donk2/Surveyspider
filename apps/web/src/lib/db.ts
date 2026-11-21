import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export function createPrisma(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error("DATABASE_URL is not set. Copy apps/web/.env.example to .env.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One client per server process (and one across hot reloads in development).
const globalForPrisma = globalThis as unknown as { afriPrisma?: PrismaClient };

export function getDb(): PrismaClient {
  globalForPrisma.afriPrisma ??= createPrisma();
  return globalForPrisma.afriPrisma;
}
