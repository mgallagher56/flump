export interface RateLimitWindow {
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Whole seconds until the caller may retry. 0 when allowed. */
  retryAfterSeconds: number;
  /** The window that refused the hit (the one with the longest wait), when one did. */
  exceeded?: RateLimitWindow;
  /** Hits left in the tightest window after this one, when known. */
  remaining?: number;
}

/**
 * The shared counter store (BE-07, M10, decision D6): Postgres in the app
 * (`PgRateLimitStore`), so a limit holds across replicas and restarts. Structurally the same as
 * `LimitStore` in `@flump/mcp`, so the backend hands the one instance to the MCP limiters too.
 */
export interface SharedRateLimitStore {
  /** Counts one hit against every window only when all have room, atomically. */
  hit(key: string, windows: readonly RateLimitWindow[], now?: number): Promise<RateLimitDecision>;
  /** Reads one window without counting: `allowed` is false once it is full. */
  peek(key: string, window: RateLimitWindow, now?: number): Promise<RateLimitDecision>;
  /** Drops one window's counter. */
  reset(key: string, window: RateLimitWindow): Promise<void>;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const SWEEP_EVERY = 500;
export const DEFAULT_MAX_ENTRIES = 50_000;

/**
 * Fixed-window, in-memory counters (E20-N13). One bucket per key and window length. A request is
 * counted against every window only when all of them have room, so a blocked attempt never burns
 * quota. Per process: counters reset on deploy and multiply by replica count, so it holds only the
 * cheap high-volume buckets (reads, writes, receipt reads, import staging, the per-IP ceiling) and
 * stands in for the shared store when that is unavailable. The sensitive buckets live in
 * `PgRateLimitStore` (see SHARED_RATE_LIMIT_CLASSES).
 */
export class RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private hits = 0;

  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  hit(key: string, windows: readonly RateLimitWindow[], now = Date.now()): RateLimitDecision {
    if (++this.hits % SWEEP_EVERY === 0) this.sweep(now);

    let blocked: { window: RateLimitWindow; retryMs: number } | undefined;
    const current = windows.map((w) => {
      const id = `${key}|${w.windowMs}`;
      let bucket = this.buckets.get(id);
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + w.windowMs };
      }
      if (bucket.count >= w.limit) {
        const retryMs = bucket.resetAt - now;
        if (!blocked || retryMs > blocked.retryMs) blocked = { window: w, retryMs };
      }
      return { id, bucket, w };
    });

    if (blocked) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(blocked.retryMs / 1000)),
        exceeded: blocked.window,
        remaining: 0,
      };
    }
    let remaining = Number.POSITIVE_INFINITY;
    for (const { id, bucket, w } of current) {
      bucket.count++;
      remaining = Math.min(remaining, w.limit - bucket.count);
      if (!this.buckets.has(id)) this.makeRoom(now);
      this.buckets.set(id, bucket);
    }
    return {
      allowed: true,
      retryAfterSeconds: 0,
      ...(Number.isFinite(remaining) ? { remaining } : {}),
    };
  }

  /** Reads one window without counting. */
  peek(key: string, window: RateLimitWindow, now = Date.now()): RateLimitDecision {
    const bucket = this.buckets.get(`${key}|${window.windowMs}`);
    if (!bucket || now >= bucket.resetAt || bucket.count < window.limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds, exceeded: window, remaining: 0 };
  }

  reset(key: string, window: RateLimitWindow): void {
    this.buckets.delete(`${key}|${window.windowMs}`);
  }

  /** Bounds memory: drop expired buckets, then the oldest-inserted ones, once at the cap. */
  private makeRoom(now: number): void {
    if (this.buckets.size < this.maxEntries) return;
    this.sweep(now);
    for (const id of this.buckets.keys()) {
      if (this.buckets.size < this.maxEntries) break;
      this.buckets.delete(id);
    }
  }

  sweep(now = Date.now()): void {
    for (const [id, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(id);
    }
  }

  size(): number {
    return this.buckets.size;
  }
}

/**
 * The in-memory store behind the shared interface: used when the app has no DataSource (unit and
 * HTTP test modules) and as the fallback when Postgres fails for a fail-open bucket.
 */
export class MemorySharedRateLimitStore implements SharedRateLimitStore {
  constructor(readonly memory: RateLimitStore = new RateLimitStore()) {}

  async hit(key: string, windows: readonly RateLimitWindow[], now?: number) {
    return this.memory.hit(key, windows, now);
  }

  async peek(key: string, window: RateLimitWindow, now?: number) {
    return this.memory.peek(key, window, now);
  }

  async reset(key: string, window: RateLimitWindow): Promise<void> {
    this.memory.reset(key, window);
  }
}
