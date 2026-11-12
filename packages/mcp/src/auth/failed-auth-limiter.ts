/**
 * Pre-auth limiter: counts failed authentication attempts per client IP so PAT guessing
 * is throttled before the per-user limiter (which only applies after auth succeeds).
 * In-memory and per-process; the map is bounded so a spray of IPs cannot exhaust memory.
 */
export interface FailedAuthCheck {
  blocked: boolean;
  retryAfterSeconds: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export class FailedAuthLimiter {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly maxFailures = 10,
    private readonly windowMs = 60_000,
    private readonly maxEntries = 10_000,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  check(ip: string, now = Date.now()): FailedAuthCheck {
    const entry = this.entries.get(ip);
    if (!entry || now >= entry.resetAt) {
      return { blocked: false, retryAfterSeconds: 0 };
    }
    if (entry.count >= this.maxFailures) {
      return {
        blocked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    }
    return { blocked: false, retryAfterSeconds: 0 };
  }

  recordFailure(ip: string, now = Date.now()): void {
    const entry = this.entries.get(ip);
    if (entry && now < entry.resetAt) {
      entry.count++;
      return;
    }
    this.entries.delete(ip);
    if (this.entries.size >= this.maxEntries) this.evict(now);
    this.entries.set(ip, { count: 1, resetAt: now + this.windowMs });
  }

  private evict(now: number): void {
    for (const [key, e] of this.entries) {
      if (now >= e.resetAt) this.entries.delete(key);
    }
    // Still full: drop oldest insertions (Map preserves insertion order).
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
