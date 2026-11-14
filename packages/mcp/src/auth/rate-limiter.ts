import {
  isMissingTableError,
  type LimitDecision,
  type LimitStore,
  type LimitWindow,
  MemoryLimitStore,
} from "./limit-store.js";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  statusCode?: number;
  message?: string;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/**
 * Per-token fixed-window limit for authenticated MCP requests: `maxPerMinute` a minute and
 * `maxPerHour` an hour. The counters live in the injected store (the backend passes its shared
 * Postgres store); the default is in memory.
 *
 * Fails open: when the store throws, the request is allowed and the error logged. This is a
 * general usage cap, and refusing every agent while the database blips would do more harm than a
 * few uncounted calls. The pre-auth failed-attempt limiter is the one that fails closed. A missing
 * table (an unmigrated dev database) falls back to memory.
 */
export class McpRateLimiter {
  private readonly minute: LimitWindow;
  private readonly hour: LimitWindow;
  private readonly fallback = new MemoryLimitStore();
  private missingTable = false;

  constructor(
    maxPerMinute = 60,
    maxPerHour = 300,
    private readonly store: LimitStore = new MemoryLimitStore(),
  ) {
    this.minute = { limit: maxPerMinute, windowMs: MINUTE_MS };
    this.hour = { limit: maxPerHour, windowMs: HOUR_MS };
  }

  /** `now` is for tests only: without it the store's own clock (the database's) is used. */
  async checkLimit(key: string, now?: number): Promise<RateLimitResult> {
    const windows = [this.minute, this.hour];
    let decision: LimitDecision;
    try {
      decision = await (this.missingTable ? this.fallback : this.store).hit(
        `mcp:${key}`,
        windows,
        now,
      );
    } catch (err) {
      if (isMissingTableError(err)) {
        if (!this.missingTable) {
          console.error("MCP limit store table is missing (unmigrated schema): limits in memory");
        }
        this.missingTable = true;
        decision = await this.fallback.hit(`mcp:${key}`, windows, now);
      } else {
        console.error(
          `MCP rate-limit store failed, allowing the request: ${err instanceof Error ? err.name : "error"}`,
        );
        return { allowed: true, limit: this.minute.limit, remaining: 0, resetSeconds: 60 };
      }
    }

    if (!decision.allowed) {
      const window = decision.exceeded ?? this.minute;
      const per = window.windowMs >= HOUR_MS ? "an hour" : "a minute";
      return {
        allowed: false,
        limit: window.limit,
        remaining: 0,
        resetSeconds: decision.retryAfterSeconds,
        statusCode: 429,
        message: `Too many requests. The limit is ${window.limit} ${per}. Try again in ${decision.retryAfterSeconds} seconds.`,
      };
    }
    return {
      allowed: true,
      limit: this.minute.limit,
      remaining: decision.remaining ?? 0,
      resetSeconds: 60,
    };
  }
}
