import { type LimitStore, type LimitWindow, MemoryLimitStore } from "./limit-store.js";

/**
 * Pre-auth limiter: counts failed authentication attempts per client IP so PAT guessing
 * is throttled before the per-user limiter (which only applies after auth succeeds).
 * The counters live in the injected store (the backend passes its shared Postgres store, so the
 * limit holds across replicas and restarts); the default store is in memory and bounded.
 *
 * Fails closed: when the store cannot be read, `check` reports the caller blocked for a short
 * while. This is the credential-guessing guard, so an outage must not switch it off. Writes that
 * fail (recording a failure or a success) are logged and skipped.
 */
export interface FailedAuthCheck {
  blocked: boolean;
  retryAfterSeconds: number;
}

/**
 * Normalise a client address into a limiter key: IPv4-mapped IPv6 (::ffff:a.b.c.d)
 * becomes plain IPv4; other IPv6 addresses collapse to their /64 prefix so a client
 * cannot dodge the limit by rotating within its own /64. Anything else is unchanged.
 */
export function normalizeIpKey(ip: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];
  if (!ip.includes(":")) return ip;
  const addr = ip.split("%")[0] ?? ip;
  const [head, tail] = addr.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail === undefined ? [] : tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? headParts
      : [
          ...headParts,
          ...Array(Math.max(0, 8 - headParts.length - tailParts.length)).fill("0"),
          ...tailParts,
        ];
  if (groups.length !== 8) return ip;
  const prefix = groups.slice(0, 4).map((g) => Number.parseInt(g || "0", 16).toString(16));
  if (prefix.some((g) => g === "NaN")) return ip;
  return `${prefix.join(":")}::/64`;
}

/** Seconds a caller is held off when the store fails during `check`. */
export const FAIL_CLOSED_RETRY_SECONDS = 30;

const errName = (err: unknown) => (err instanceof Error ? err.name : "error");

export class FailedAuthLimiter {
  private readonly window: LimitWindow;
  /** Same bucket as `window`, read with a limit of 1: "has this IP failed at all?". */
  private readonly anyFailure: LimitWindow;
  /** The once-per-window marker for `recordSuccess`. */
  private readonly clearMarker: LimitWindow;

  constructor(
    maxFailures = 10,
    windowMs = 60_000,
    private readonly store: LimitStore = new MemoryLimitStore(),
  ) {
    this.window = { limit: maxFailures, windowMs };
    this.anyFailure = { limit: 1, windowMs };
    this.clearMarker = { limit: 1, windowMs };
  }

  /**
   * Call after a successful authentication so valid clients behind a shared IP are not blocked.
   * Clears the failure count at most once per window: otherwise an attacker holding any valid
   * token could interleave one valid request between guesses and never reach the limit.
   */
  async recordSuccess(ip: string, now = Date.now()): Promise<void> {
    const key = normalizeIpKey(ip);
    try {
      const failures = await this.store.peek(failKey(key), this.anyFailure, now);
      if (failures.allowed) return; // no failures in this window: nothing to clear
      const marker = await this.store.hit(clearKey(key), [this.clearMarker], now);
      if (marker.allowed) await this.store.reset(failKey(key), this.window);
    } catch (err) {
      console.error(`MCP failed-auth store failed on success: ${errName(err)}`);
    }
  }

  async check(rawIp: string, now = Date.now()): Promise<FailedAuthCheck> {
    try {
      const d = await this.store.peek(failKey(normalizeIpKey(rawIp)), this.window, now);
      return d.allowed
        ? { blocked: false, retryAfterSeconds: 0 }
        : { blocked: true, retryAfterSeconds: d.retryAfterSeconds };
    } catch (err) {
      console.error(`MCP failed-auth store failed, refusing: ${errName(err)}`);
      return { blocked: true, retryAfterSeconds: FAIL_CLOSED_RETRY_SECONDS };
    }
  }

  async recordFailure(rawIp: string, now = Date.now()): Promise<void> {
    try {
      // Refused once the window is full, which is fine: `check` already blocks at that point.
      await this.store.hit(failKey(normalizeIpKey(rawIp)), [this.window], now);
    } catch (err) {
      console.error(`MCP failed-auth store failed on failure: ${errName(err)}`);
    }
  }
}

const failKey = (ipKey: string) => `mcpauth:fail:${ipKey}`;
const clearKey = (ipKey: string) => `mcpauth:cleared:${ipKey}`;
