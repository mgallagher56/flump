import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export const AGENT_AUDIT_OUTCOMES = ["ok", "error", "denied"] as const;
export type AgentAuditOutcome = (typeof AGENT_AUDIT_OUTCOMES)[number];

/**
 * One row per MCP `tools/call` (E17-N17, 13-month retention). Identifiers, counts and timings
 * only: no amounts and no free text. `args_fingerprint` is an HMAC-SHA256 of the arguments, so
 * repeated calls can be correlated without storing what was asked.
 */
@Entity("agent_audit_events")
@Index("IDX_agent_audit_events_user_created", ["userId", "createdAt"])
@Index("IDX_agent_audit_events_created", ["createdAt"])
@Check("CHK_agent_audit_events_outcome", `"outcome" IN ('ok', 'error', 'denied')`)
export class AgentAuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "token_id", type: "uuid", nullable: true })
  tokenId: string | null;

  @Column({ name: "client_name", type: "varchar", length: 64, nullable: true })
  clientName: string | null;

  @Column({ name: "tool_name", type: "varchar", length: 64 })
  toolName: string;

  @Column({ name: "scopes_used", type: "simple-array", default: "" })
  scopesUsed: string[];

  @Column({ type: "varchar", length: 16 })
  outcome: AgentAuditOutcome;

  @Column({ name: "error_code", type: "varchar", length: 64, nullable: true })
  errorCode: string | null;

  @Column({ name: "latency_ms", type: "integer" })
  latencyMs: number;

  @Column({ name: "response_bytes", type: "integer" })
  responseBytes: number;

  @Column({ name: "args_fingerprint", type: "varchar", length: 64, nullable: true })
  argsFingerprint: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
