import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seed } from "./seed-lib";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

seed(prisma, { ownerEmail: process.env.SEED_OWNER_EMAIL })
  .then((r) => console.log(`Seeded: organisation ${r.organisationId}${r.ownerId ? `, owner ${r.ownerId}` : ""}`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
