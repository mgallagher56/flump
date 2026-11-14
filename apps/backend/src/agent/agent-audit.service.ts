import { createHmac } from "node:crypto";
import { PAGE_LIMITS } from "@flump/api-contract";
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
  /** A fingerprint already made with `fingerprint()` (the MCP handler's hook). Used when `args` is absent. */
  argsFingerprint?: string | null;
}

/** One row of GET /mcp-tokens/:id/activity: identifiers and timings, no fingerprint. */
export interface AgentAuditActivity {
  id: string;
  toolName: string;
  outcome: AgentAuditOutcome;
  errorCode: string | null;
  scopesUsed: string[];
  clientName: string | null;
  latencyMs: number;
  responseBytes: number;
  createdAt: string;
}

/** Activity page sizes come from the contract (PAGE_LIMITS.activity, BE-09). */
export const MAX_ACTIVITY_PAGE = PAGE_LIMITS.activity.max;
const DEFAULT_ACTIVITY_PAGE = PAGE_LIMITS.activity.default;
const RETENTION_MONTHS = 13;
const INT_MAX = 2_147_483_647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const ERROR_CODE = /^[A-Za-z0-9_.-]{1,64}$/;
const SCOPE = /^[a-z][a-z:_-]{0,63}$/;
const HEX64 = /^[0-9a-f]{64}$/;

/** The opaque activity cursor: base64url of the last row's id. */
export function encodeActivityCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

/** The row id inside an activity cursor, or null when it is not one of ours. */
export function decodeActivityCursor(cursor: string): string | null {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(cursor)) return null;
  const id = Buffer.from(cursor, "base64url").toString("utf8");
  return UUID.test(id) ? id : null;
}

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
 * McpService feeds it from the in-process MCP handler (E17 re-plan PR D), so a client cannot skip
 * it; GET /mcp-tokens/:id/activity reads it.
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
      argsFingerprint:
        input.args !== undefined
          ? this.fingerprint(input.args)
          : typeof input.argsFingerprint === "string" && HEX64.test(input.argsFingerprint)
            ? input.argsFingerprint
            : null,
    });
  }

  /**
   * One page of a token's audit rows, newest first (GET /mcp-tokens/:id/activity). The caller
   * must have checked that the token is the user's; the user id is in the filter as well, so a
   * token id alone never reaches another user's rows. Never returns the argument fingerprint.
   *
   * Paging uses a compound (created_at, id) cursor. The cursor is the last row's id, opaque to
   * clients; the database reads that row's created_at itself, at full (microsecond) precision, so
   * rows that share a timestamp are neither skipped nor repeated across pages. A cursor that names
   * no row of this token (purged, or another token's) returns an empty page.
   */
  async listForToken(
    userId: string,
    tokenId: string,
    options: { limit?: number; before?: string } = {},
  ): Promise<{ events: AgentAuditActivity[]; nextBefore: string | null }> {
    const limit = Math.min(
      MAX_ACTIVITY_PAGE,
      Math.max(1, Math.floor(options.limit ?? DEFAULT_ACTIVITY_PAGE)),
    );
    const qb = this.events
      .createQueryBuilder("e")
      .where("e.userId = :userId", { userId })
      .andWhere("e.tokenId = :tokenId", { tokenId });
    if (options.before !== undefined) {
      const cursorId = decodeActivityCursor(options.before);
      if (!cursorId) return { events: [], nextBefore: null };
      qb.andWhere(
        `("e"."created_at", "e"."id") < (
           SELECT c."created_at", c."id" FROM "agent_audit_events" c
           WHERE c."id" = :cursorId AND c."user_id" = :userId AND c."token_id" = :tokenId
         )`,
        { cursorId },
      );
    }
    const rows = await qb
      .orderBy("e.createdAt", "DESC")
      .addOrderBy("e.id", "DESC")
      .limit(limit + 1)
      .getMany();
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      events: page.map((r) => ({
        id: r.id,
        toolName: r.toolName,
        outcome: r.outcome,
        errorCode: r.errorCode,
        scopesUsed: r.scopesUsed.filter(Boolean),
        clientName: r.clientName,
        latencyMs: r.latencyMs,
        responseBytes: r.responseBytes,
        createdAt: r.createdAt.toISOString(),
      })),
      nextBefore: rows.length > limit && last ? encodeActivityCursor(last.id) : null,
    };
  }

  /** Deletes rows older than 13 months; returns how many. Run daily by AgentAuditPurgeScheduler. */
  async purgeOlderThan13Months(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
    const result = await this.events.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }
}
