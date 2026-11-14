/**
 * Storage seam for the MCP limiters (BE-07, M10). Both limiters are fixed-window counters; where
 * the counters live is the store's business. The package ships an in-memory store (one process,
 * reset on restart) for stdio and tests; the backend injects its shared Postgres store so limits
 * hold across replicas and restarts. Keeps this package free of any database dependency.
 */
export interface LimitWindow {
  limit: number;
  windowMs: number;
}

export interface LimitDecision {
  allowed: boolean;
  /** Whole seconds until the caller may retry. 0 when allowed. */
  retryAfterSeconds: number;
  /** The tightest window that refused the hit, when one did. */
  exceeded?: LimitWindow;
  /** Hits left in the tightest window after this one, when the store knows. */
  remaining?: number;
}

export interface LimitStore {
  /**
   * Counts one hit against every window of `key` only when all of them have room, atomically, so
   * a refused hit never spends quota. A window whose time has passed starts again from zero.
   */
  hit(key: string, windows: readonly LimitWindow[], now?: number): Promise<LimitDecision>;
  /** Reads one window without counting: `allowed` is false once the window is full. */
  peek(key: string, window: LimitWindow, now?: number): Promise<LimitDecision>;
  /** Drops one window's counter for `key`. */
  reset(key: string, window: LimitWindow): Promise<void>;
  /** Gives back one hit in the current window (never below zero); a no-op when there is none. */
  refund(key: string, window: LimitWindow, now?: number): Promise<void>;
}

/**
 * True for Postgres "undefined_table" (42P01): the shared store's table is not there (an
 * unmigrated dev database). The limiters then fall back to memory rather than refuse or allow all.
 */
export function isMissingTableError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; driverError?: { code?: unknown } };
  return e.code === "42P01" || e.driverError?.code === "42P01";
}

interface Bucket {
  count: number;
  resetAt: number;
}

const retrySeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
const bucketId = (key: string, w: LimitWindow) => `${key}|${w.windowMs}`;

/** In-process fixed-window store, bounded so a spray of keys cannot exhaust memory. */
export class MemoryLimitStore implements LimitStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly maxEntries = 10_000) {}

  get size(): number {
    return this.buckets.size;
  }

  async hit(
    key: string,
    windows: readonly LimitWindow[],
    now = Date.now(),
  ): Promise<LimitDecision> {
    let blocked: { window: LimitWindow; retryMs: number } | undefined;
    const current = windows.map((window) => {
      const id = bucketId(key, window);
      let bucket = this.buckets.get(id);
      if (!bucket || now >= bucket.resetAt) bucket = { count: 0, resetAt: now + window.windowMs };
      if (bucket.count >= window.limit) {
        const retryMs = bucket.resetAt - now;
        if (!blocked || retryMs > blocked.retryMs) blocked = { window, retryMs };
      }
      return { id, bucket, window };
    });
    if (blocked) {
      return {
        allowed: false,
        retryAfterSeconds: retrySeconds(blocked.retryMs),
        exceeded: blocked.window,
        remaining: 0,
      };
    }
    let remaining = Number.POSITIVE_INFINITY;
    for (const { id, bucket, window } of current) {
      bucket.count++;
      remaining = Math.min(remaining, window.limit - bucket.count);
      if (!this.buckets.has(id)) this.makeRoom(now);
      this.buckets.set(id, bucket);
    }
    return {
      allowed: true,
      retryAfterSeconds: 0,
      ...(Number.isFinite(remaining) ? { remaining } : {}),
    };
  }

  async peek(key: string, window: LimitWindow, now = Date.now()): Promise<LimitDecision> {
    const bucket = this.buckets.get(bucketId(key, window));
    if (!bucket || now >= bucket.resetAt || bucket.count < window.limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: false,
      retryAfterSeconds: retrySeconds(bucket.resetAt - now),
      exceeded: window,
      remaining: 0,
    };
  }

  async reset(key: string, window: LimitWindow): Promise<void> {
    this.buckets.delete(bucketId(key, window));
  }

  async refund(key: string, window: LimitWindow, now = Date.now()): Promise<void> {
    const bucket = this.buckets.get(bucketId(key, window));
    if (bucket && now < bucket.resetAt && bucket.count > 0) bucket.count--;
  }

  /** Drops expired buckets, then the oldest insertions, once at the cap. */
  private makeRoom(now: number): void {
    if (this.buckets.size < this.maxEntries) return;
    for (const [id, b] of this.buckets) {
      if (now >= b.resetAt) this.buckets.delete(id);
    }
    while (this.buckets.size >= this.maxEntries) {
      const oldest = this.buckets.keys().next().value;
      if (oldest === undefined) break;
      this.buckets.delete(oldest);
    }
  }
}
