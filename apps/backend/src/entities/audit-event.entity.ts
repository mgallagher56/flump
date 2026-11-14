import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * The sensitive actions recorded in `audit_events` (BE-06, finding H12). Adding one means adding it
 * to the CHECK below in a migration, and calling `recordAuditEvent` where the action happens:
 * audit-events.spec.ts fails on an action with no call site.
 */
export const AUDIT_ACTIONS = [
  "mcp_token.minted",
  "mcp_token.revoked",
  "bank_connection.connected",
  "bank_connection.disconnected",
  "account.deleted",
  "financial_data.reset",
  "user.deleted",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTOR_TYPES = ["user", "system"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

/**
 * Append-only record of sensitive actions (BE-06, H12). A database trigger refuses every UPDATE;
 * rows leave only through the retention job (13 months, ruling D4) or account erasure. Holds
 * identifiers only: never names, amounts, tokens or free text. `user_id` is null only for
 * `user.deleted`, written after the user's rows are erased (it carries the tombstone id instead).
 */
@Entity("audit_events")
@Index("IDX_audit_events_user_created", ["userId", "createdAt"])
@Index("IDX_audit_events_created", ["createdAt"])
@Check("CHK_audit_events_action", `"action" IN (${AUDIT_ACTIONS.map((a) => `'${a}'`).join(", ")})`)
@Check("CHK_audit_events_actor_type", `"actor_type" IN ('user', 'system')`)
export class AuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "varchar", nullable: true })
  userId: string | null;

  @Column({ type: "varchar", length: 64 })
  action: AuditAction;

  @Column({ name: "actor_type", type: "varchar", length: 16, default: "user" })
  actorType: AuditActorType;

  /** The token, bank connection, account or tombstone the action was about. */
  @Column({ name: "target_id", type: "uuid", nullable: true })
  targetId: string | null;

  /** The request id (BE-07), to join the record to log lines. */
  @Column({ name: "request_id", type: "varchar", length: 128, nullable: true })
  requestId: string | null;

  /** Allow-listed identifiers and counts only (see audit-events.ts `sanitiseAuditMetadata`). */
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  metadata: Record<string, string | number | boolean | string[]>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
