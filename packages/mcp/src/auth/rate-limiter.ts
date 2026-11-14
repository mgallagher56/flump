export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  statusCode?: number;
  message?: string;
}

interface WindowBucket {
  minuteCount: number;
  minuteResetAt: number;
  hourCount: number;
  hourResetAt: number;
}

export class McpRateLimiter {
  private readonly buckets = new Map<string, WindowBucket>();
  private readonly maxPerMinute: number;
  private readonly maxPerHour: number;

  constructor(maxPerMinute = 60, maxPerHour = 300) {
    this.maxPerMinute = maxPerMinute;
    this.maxPerHour = maxPerHour;
  }

  checkLimit(key: string, now = Date.now()): RateLimitResult {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        minuteCount: 0,
        minuteResetAt: now + 60_000,
        hourCount: 0,
        hourResetAt: now + 3_600_000,
      };
      this.buckets.set(key, bucket);
    }

    // Reset minute window if expired
    if (now >= bucket.minuteResetAt) {
      bucket.minuteCount = 0;
      bucket.minuteResetAt = now + 60_000;
    }

    // Reset hour window if expired
    if (now >= bucket.hourResetAt) {
      bucket.hourCount = 0;
      bucket.hourResetAt = now + 3_600_000;
    }

    // Check per-minute cap
    if (bucket.minuteCount >= this.maxPerMinute) {
      const resetSeconds = Math.max(1, Math.ceil((bucket.minuteResetAt - now) / 1000));
      return {
        allowed: false,
        limit: this.maxPerMinute,
        remaining: 0,
        resetSeconds,
        statusCode: 429,
        message: `Too many requests. The limit is ${this.maxPerMinute} a minute. Try again in ${resetSeconds} seconds.`,
      };
    }

    // Check per-hour cap
    if (bucket.hourCount >= this.maxPerHour) {
      const resetSeconds = Math.max(1, Math.ceil((bucket.hourResetAt - now) / 1000));
      return {
        allowed: false,
        limit: this.maxPerHour,
        remaining: 0,
        resetSeconds,
        statusCode: 429,
        message: `Too many requests. The limit is ${this.maxPerHour} an hour. Try again in ${resetSeconds} seconds.`,
      };
    }

    bucket.minuteCount++;
    bucket.hourCount++;

    const remaining = Math.min(
      this.maxPerMinute - bucket.minuteCount,
      this.maxPerHour - bucket.hourCount,
    );
    const resetSeconds = Math.max(1, Math.ceil((bucket.minuteResetAt - now) / 1000));

    return {
      allowed: true,
      limit: this.maxPerMinute,
      remaining,
      resetSeconds,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  clearAll(): void {
    this.buckets.clear();
  }
}
