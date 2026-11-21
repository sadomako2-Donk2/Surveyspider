import "server-only";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { sha256 } from "./http";

type Tx = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  actorId?: string | null;
  organisationId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}

/** Appends to the audit log. IP addresses are stored only as a hash. */
export function audit(db: Tx, e: AuditInput) {
  return db.auditEvent.create({
    data: {
      actorId: e.actorId ?? null,
      organisationId: e.organisationId ?? null,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      metadata: e.metadata ?? {},
      ipHash: e.ip ? sha256(`afri-audit|${e.ip}`).slice(0, 32) : null,
    },
  });
}
