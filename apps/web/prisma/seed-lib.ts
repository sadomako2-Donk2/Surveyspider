import type { PrismaClient } from "../src/generated/prisma/client";

export const AFRIMETRICA_ORG = { slug: "afrimetrica", name: "Afrimetrica" } as const;

export interface SeedOptions {
  /** Optional: make this email the owner of the Afrimetrica organisation (account is created without a password). */
  ownerEmail?: string;
}

/**
 * Reference data only. Safe to run many times (everything is an upsert).
 * Deliberately creates no sample courses, surveys, responses or people.
 */
export async function seed(prisma: PrismaClient, opts: SeedOptions = {}) {
  const org = await prisma.organisation.upsert({
    where: { slug: AFRIMETRICA_ORG.slug },
    update: {},
    create: { ...AFRIMETRICA_ORG },
  });

  let owner = null;
  const email = opts.ownerEmail?.trim().toLowerCase();
  if (email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`SEED_OWNER_EMAIL is not a valid email: ${email}`);
    owner = await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
    await prisma.membership.upsert({
      where: { userId_organisationId: { userId: owner.id, organisationId: org.id } },
      update: { role: "OWNER" },
      create: { userId: owner.id, organisationId: org.id, role: "OWNER" },
    });
  }
  return { organisationId: org.id, ownerId: owner?.id ?? null };
}
