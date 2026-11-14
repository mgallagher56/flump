import type { EntityManager } from "typeorm";
import {
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditActorType,
  AuditEvent,
} from "../entities/audit-event.entity";
import { currentRequestId, isSafeRequestId } from "../observability/request-context";

/**
 * Metadata keys an audit row may carry, each a short identifier, flag or count. Anything else is
 * dropped, so a caller can never put a name, amount, token or free text into the trail.
 */
const METADATA_KEYS = new Set([
  "scopes",
  "expiryDays",
  "allowStaging",
  "institutionId",
  "authType",
  "consentRevoked",
  "removed",
  "tombstoneId",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENT = /^[A-Za-z0-9:_.-]{1,64}$/;
const MAX_LIST = 16;

export type AuditMetadataValue = string | number | boolean | string[];

export interface AuditEventInput {
  /** Null only for `user.deleted`. */
  userId: string | null;
  action: AuditAction;
  actorType?: AuditActorType;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

function safeValue(value: unknown): AuditMetadataValue | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return IDENT.test(value) ? value : undefined;
  if (Array.isArray(value)) {
    const items = value.filter((v): v is string => typeof v === "string" && IDENT.test(v));
    return items.slice(0, MAX_LIST);
  }
  return undefined;
}

/** Keeps allow-listed keys with identifier, flag, count or identifier-list values. */
export function sanitiseAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, AuditMetadataValue> {
  const out: Record<string, AuditMetadataValue> = {};
  for (const [key, raw] of Object.entries(metadata ?? {})) {
    if (!METADATA_KEYS.has(key)) continue;
    // Row counts per table (account deletion): identifier keys, integer values.
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const counts = Object.entries(raw as Record<string, unknown>)
        .filter(([k, v]) => IDENT.test(k) && Number.isInteger(v))
        .map(([k, v]) => `${k}:${v}`);
      out[key] = counts.slice(0, MAX_LIST * 2);
      continue;
    }
    const value = safeValue(raw);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Writes one `audit_events` row (BE-06, H12) with the given manager, so a caller inside a
 * transaction records the action atomically with it: if the action rolls back, so does its record,
 * and if the record cannot be written, the action fails. The request id comes from the request
 * context (BE-07) when there is one.
 */
export async function recordAuditEvent(
  manager: EntityManager,
  input: AuditEventInput,
): Promise<void> {
  if (!(AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new Error(`Unknown audit action: ${String(input.action)}`);
  }
  if (input.userId === null && input.action !== "user.deleted") {
    throw new Error("Only user.deleted is recorded without a user id");
  }
  const requestId = currentRequestId();
  await manager.getRepository(AuditEvent).insert({
    userId: input.userId,
    action: input.action,
    actorType: input.actorType ?? "user",
    targetId:
      typeof input.targetId === "string" && UUID.test(input.targetId) ? input.targetId : null,
    requestId: isSafeRequestId(requestId) ? requestId : null,
    metadata: sanitiseAuditMetadata(input.metadata),
  });
}
