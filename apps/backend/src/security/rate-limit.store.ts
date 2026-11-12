export interface RateLimitWindow {
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Whole seconds until the caller may retry. 0 when allowed. */
  retryAfterSeconds: number;
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
 * quota. Counters reset on deploy (accepted risk R14); there is a single backend instance.
 */
export class RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private hits = 0;

  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  hit(key: string, windows: readonly RateLimitWindow[], now = Date.now()): RateLimitDecision {
    if (++this.hits % SWEEP_EVERY === 0) this.sweep(now);

    let retryAfterMs = 0;
    const current = windows.map((w) => {
      const id = `${key}|${w.windowMs}`;
      let bucket = this.buckets.get(id);
      if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + w.windowMs };
      }
      if (bucket.count >= w.limit) retryAfterMs = Math.max(retryAfterMs, bucket.resetAt - now);
      return { id, bucket };
    });

    if (retryAfterMs > 0) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }
    for (const { id, bucket } of current) {
      bucket.count++;
      if (!this.buckets.has(id)) this.makeRoom(now);
      this.buckets.set(id, bucket);
    }
    return { allowed: true, retryAfterSeconds: 0 };
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
