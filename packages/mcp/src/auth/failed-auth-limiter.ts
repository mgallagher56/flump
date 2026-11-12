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

  /** Call after a successful authentication so valid clients behind a shared IP are not blocked. */
  recordSuccess(ip: string): void {
    this.entries.delete(normalizeIpKey(ip));
  }

  check(rawIp: string, now = Date.now()): FailedAuthCheck {
    const ip = normalizeIpKey(rawIp);
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

  recordFailure(rawIp: string, now = Date.now()): void {
    const ip = normalizeIpKey(rawIp);
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
