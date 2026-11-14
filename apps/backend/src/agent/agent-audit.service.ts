import { createHmac } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, type Repository } from "typeorm";
import {
  AGENT_AUDIT_OUTCOMES,
  AgentAuditEvent,
  type AgentAuditOutcome,
} from "../entities/agent-audit-event.entity";

export interface AgentAuditInput {
  userId: string;
  tokenId?: string | null;
  clientName?: string | null;
  toolName: string;
  scopesUsed?: string[];
  outcome: AgentAuditOutcome;
  errorCode?: string | null;
  latencyMs: number;
  responseBytes: number;
  /** The tool arguments. Only their HMAC is stored, never the arguments themselves. */
  args?: unknown;
}

const RETENTION_MONTHS = 13;
const INT_MAX = 2_147_483_647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const ERROR_CODE = /^[A-Za-z0-9_.-]{1,64}$/;
const SCOPE = /^[a-z][a-z:_-]{0,63}$/;

/** JSON with object keys sorted at every level, so equal arguments always hash the same. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v ?? null)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Client names are self-reported: keep a short identifier-like token, never free text. */
function safeClientName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/[^A-Za-z0-9 ._/-]/g, "")
    .trim()
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : null;
}

const clampInt = (n: unknown): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(INT_MAX, Math.max(0, Math.round(n))) : 0;

/**
 * The agent audit trail (E17-N17): one row per MCP `tools/call`, identifiers and timings only.
 * Not wired into packages/mcp yet (E17 re-plan PR D), and the activity route is PR D too.
 */
@Injectable()
export class AgentAuditService {
  constructor(
    @InjectRepository(AgentAuditEvent) private readonly events: Repository<AgentAuditEvent>,
  ) {}

  /** HMAC-SHA256 of the canonical JSON of `args` under `MCP_AUDIT_HMAC_KEY`; null when unset. */
  fingerprint(args: unknown, key = process.env.MCP_AUDIT_HMAC_KEY): string | null {
    if (!key || args === undefined) return null;
    return createHmac("sha256", key).update(canonicalJson(args)).digest("hex");
  }

  async record(input: AgentAuditInput): Promise<void> {
    const outcome = (AGENT_AUDIT_OUTCOMES as readonly string[]).includes(input.outcome)
      ? input.outcome
      : "error";
    await this.events.insert({
      userId: input.userId,
      tokenId: typeof input.tokenId === "string" && UUID.test(input.tokenId) ? input.tokenId : null,
      clientName: safeClientName(input.clientName),
      toolName: TOOL_NAME.test(input.toolName) ? input.toolName : "unknown",
      scopesUsed: (input.scopesUsed ?? []).filter((s) => SCOPE.test(s)),
      outcome,
      errorCode:
        typeof input.errorCode === "string" && ERROR_CODE.test(input.errorCode)
          ? input.errorCode
          : null,
      latencyMs: clampInt(input.latencyMs),
      responseBytes: clampInt(input.responseBytes),
      argsFingerprint: this.fingerprint(input.args),
    });
  }

  /** Deletes rows older than 13 months; returns how many. PR D schedules it daily. */
  async purgeOlderThan13Months(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
    const result = await this.events.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
