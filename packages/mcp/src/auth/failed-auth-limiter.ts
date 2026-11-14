import {
  isMissingTableError,
  type LimitStore,
  type LimitWindow,
  MemoryLimitStore,
} from "./limit-store.js";

/**
 * Pre-auth limiter: counts authentication attempts per client IP so PAT guessing is throttled
 * before the per-user limiter (which only applies after auth succeeds). Every attempt is counted
 * up front with one atomic store hit, before the token is checked, so concurrent guesses cannot
 * overshoot the limit; a successful verification gives its own attempt back (`recordSuccess`).
 * The counters live in the injected store (the backend passes its shared Postgres store, so the
 * limit holds across replicas and restarts); the default store is in memory and bounded.
 *
 * Fails closed: when the store errors, `attempt` reports the caller blocked for a short while, as
 * this is the credential-guessing guard and an outage must not switch it off. A missing table (an
 * unmigrated dev database) falls back to memory instead. Failed refunds are logged and skipped.
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

/** Seconds a caller is held off when the store fails during `attempt`. */
export const FAIL_CLOSED_RETRY_SECONDS = 30;

/** Logs a store failure by the error's name only: never its message or stack, which may echo a key. */
const logStoreFailure = (when: string, err: unknown) =>
  console.error(
    `MCP failed-auth store failed${when}: ${err instanceof Error ? err.name : "error"}`,
  );

export class FailedAuthLimiter {
  private readonly window: LimitWindow;
  /** Same bucket as `window`, read with a limit of 1: "is anything still counted?". */
  private readonly anyAttempt: LimitWindow;
  /** The once-per-window marker for `recordSuccess`. */
  private readonly clearMarker: LimitWindow;
  /** Used instead of the store while its table is missing (unmigrated dev database). */
  private readonly fallback = new MemoryLimitStore();
  private missingTable = false;

  constructor(
    maxAttempts = 10,
    windowMs = 60_000,
    private readonly store: LimitStore = new MemoryLimitStore(),
  ) {
    this.window = { limit: maxAttempts, windowMs };
    this.anyAttempt = { limit: 1, windowMs };
    this.clearMarker = { limit: 1, windowMs };
  }

  /** The store, or memory once the store reported its table missing. */
  private async run<T>(op: (store: LimitStore) => Promise<T>): Promise<T> {
    if (this.missingTable) return op(this.fallback);
    try {
      return await op(this.store);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      this.missingTable = true;
      console.error("MCP limit store table is missing (unmigrated schema): limits in memory");
      return op(this.fallback);
    }
  }

  /**
   * Counts one attempt for `rawIp`, atomically, before the token is checked. Blocked once the
   * window is full; a refused attempt is not counted. `now` is for tests only: without it the
   * store's own clock (the database's, for Postgres) is used.
   */
  async attempt(rawIp: string, now?: number): Promise<FailedAuthCheck> {
    try {
      const d = await this.run((s) => s.hit(failKey(normalizeIpKey(rawIp)), [this.window], now));
      return d.allowed
        ? { blocked: false, retryAfterSeconds: 0 }
        : { blocked: true, retryAfterSeconds: d.retryAfterSeconds };
    } catch (err) {
      logStoreFailure(", refusing", err);
      return { blocked: true, retryAfterSeconds: FAIL_CLOSED_RETRY_SECONDS };
    }
  }

  /**
   * Gives back the attempt counted by `attempt` when it turned out not to be a guess (the
   * verifier failed for another reason). Never throws.
   */
  async forgive(rawIp: string, now?: number): Promise<void> {
    try {
      await this.run((s) => s.refund(failKey(normalizeIpKey(rawIp)), this.window, now));
    } catch (err) {
      logStoreFailure(" on refund", err);
    }
  }

  /**
   * Call after a successful authentication: gives this attempt back, and clears earlier failures
   * so valid clients behind a shared IP are not blocked. The clearing happens at most once per
   * window: otherwise an attacker holding any valid token could interleave one valid request
   * between guesses and never reach the limit. Never throws.
   */
  async recordSuccess(ip: string, now?: number): Promise<void> {
    const key = normalizeIpKey(ip);
    try {
      await this.run(async (s) => {
        await s.refund(failKey(key), this.window, now);
        const left = await s.peek(failKey(key), this.anyAttempt, now);
        if (left.allowed) return; // nothing else counted in this window
        const marker = await s.hit(clearKey(key), [this.clearMarker], now);
        if (marker.allowed) await s.reset(failKey(key), this.window);
      });
    } catch (err) {
      logStoreFailure(" on success", err);
    }
  }
}

const failKey = (ipKey: string) => `mcpauth:fail:${ipKey}`;
const clearKey = (ipKey: string) => `mcpauth:cleared:${ipKey}`;
