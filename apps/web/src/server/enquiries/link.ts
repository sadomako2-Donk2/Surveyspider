import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Enquiries sent from an email address join that person's account once the address is confirmed.
 * Never before: otherwise anyone could sign up with someone else's address and read their enquiries.
 */
export async function linkEnquiriesToConfirmedUser(
  db: PrismaClient,
  user: { id: string; email: string; emailVerifiedAt: Date | null },
) {
  if (!user.emailVerifiedAt) return 0;
  return (
    await db.enquiry.updateMany({ where: { requesterId: null, email: user.email }, data: { requesterId: user.id } })
  ).count;
}
