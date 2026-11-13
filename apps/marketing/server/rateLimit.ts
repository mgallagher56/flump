import type { RequestHandler } from "express";

interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Requests allowed per client per window. */
  max: number;
  /** Injectable clock for tests. */
  now?: () => number;
  /** Hard cap on tracked clients so a flood of distinct IPs cannot grow memory without bound. */
  maxClients?: number;
}

/**
 * Small fixed-window, per-IP in-memory limiter for the SSR route (which reads template files
 * from disk). Behind Railway the client IP comes from req.ip, so `trust proxy` must be set to one hop.
 * Health, robots, security.txt and static assets are mounted before this and stay exempt.
 */
export function rateLimit({
  windowMs,
  max,
  now = Date.now,
  maxClients = 10_000,
}: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const t = now();
    if (hits.size >= maxClients && !hits.has(req.ip ?? "unknown")) {
      for (const [key, entry] of hits) if (entry.resetAt <= t) hits.delete(key);
      // Evict the oldest entry (Map keeps insertion order) rather than wiping everyone's counters.
      if (hits.size >= maxClients) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
    }
    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res
        .status(429)
        .set("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - t) / 1000))))
        .type("text/plain")
        .end("Too Many Requests");
      return;
    }
    next();
  };
}
