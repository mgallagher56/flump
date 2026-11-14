import type { EntityManager } from "typeorm";
import { IsNull } from "typeorm";
import { Consent, type ConsentKind } from "../entities/consent.entity";

const VERSION = /^[A-Za-z0-9 :_.,-]{1,128}$/;

export interface ConsentGrant {
  userId: string;
  kind: ConsentKind;
  /** What was agreed to: identifiers only (scopes, provider id or a terms version). */
  version: string;
  targetId?: string | null;
}

/** Records a consent (BE-06, M-PRIV3). Run it in the transaction that creates what it covers. */
export async function grantConsent(manager: EntityManager, grant: ConsentGrant): Promise<void> {
  const version = VERSION.test(grant.version) ? grant.version : "unspecified";
  await manager.getRepository(Consent).insert({
    userId: grant.userId,
    kind: grant.kind,
    version,
    targetId: grant.targetId ?? null,
    withdrawnAt: null,
  });
}

/**
 * Grants a consent unless one of this kind is already open for the target (a reconnect of the same
 * bank keeps its first grant). Returns whether a row was written.
 */
export async function grantConsentOnce(
  manager: EntityManager,
  grant: ConsentGrant,
): Promise<boolean> {
  const open = await manager.getRepository(Consent).count({
    where: {
      userId: grant.userId,
      kind: grant.kind,
      targetId: grant.targetId ?? IsNull(),
      withdrawnAt: IsNull(),
    },
  });
  if (open > 0) return false;
  await grantConsent(manager, grant);
  return true;
}

/**
 * Marks the user's open consents of this kind for this target withdrawn. Idempotent: a second call
 * changes nothing. Returns how many rows it closed.
 */
export async function withdrawConsent(
  manager: EntityManager,
  where: { userId: string; kind: ConsentKind; targetId: string },
  now: Date = new Date(),
): Promise<number> {
  const result = await manager
    .getRepository(Consent)
    .update(
      { userId: where.userId, kind: where.kind, targetId: where.targetId, withdrawnAt: IsNull() },
      { withdrawnAt: now },
    );
  return result.affected ?? 0;
}

/** Withdraws every open consent of a kind for the user (reset revokes all AI tokens at once). */
export async function withdrawAllConsents(
  manager: EntityManager,
  where: { userId: string; kind: ConsentKind },
  now: Date = new Date(),
): Promise<number> {
  const result = await manager
    .getRepository(Consent)
    .update(
      { userId: where.userId, kind: where.kind, withdrawnAt: IsNull() },
      { withdrawnAt: now },
    );
  return result.affected ?? 0;
}
