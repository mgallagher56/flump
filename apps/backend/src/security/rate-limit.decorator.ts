import { SetMetadata } from "@nestjs/common";
import type { RateLimitWindow } from "./rate-limit.store";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The E20 draft section 6 table. Reads and writes are the defaults chosen by HTTP method. */
export const RATE_LIMIT_POLICIES = {
  credential: [
    { limit: 3, windowMs: 15 * MINUTE },
    { limit: 10, windowMs: DAY },
  ],
  destructive: [{ limit: 10, windowMs: HOUR }],
  tokenMint: [{ limit: 5, windowMs: HOUR }],
  bank: [{ limit: 10, windowMs: HOUR }],
  /** Bulk record writes (copy tax year); a large copy is several chunked requests. */
  bulkWrite: [{ limit: 30, windowMs: HOUR }],
  /** Import staging (E17 re-plan section 7): 30 stage calls an hour per user. */
  importStage: [{ limit: 30, windowMs: HOUR }],
  write: [{ limit: 120, windowMs: MINUTE }],
  read: [{ limit: 600, windowMs: MINUTE }],
  /** The full data export (BE-04) reads every table the user has: 10 an hour per user. */
  dataExport: [{ limit: 10, windowMs: HOUR }],
  /** Receipt downloads move up to 5 MB each, so they get a tighter read class. */
  receiptRead: [{ limit: 30, windowMs: MINUTE }],
} as const satisfies Record<string, readonly RateLimitWindow[]>;

/** Per-IP ceiling for every non-exempt request. Generous: the web server is one IP after Phase 1. */
export const IP_RATE_LIMIT: readonly RateLimitWindow[] = [{ limit: 300, windowMs: MINUTE }];

export type RateLimitClass = keyof typeof RATE_LIMIT_POLICIES;

export const RATE_LIMIT_CLASS = "flump:rate-limit-class";
export const RATE_LIMIT_SKIP = "flump:rate-limit-skip";

/** Puts a route in a stricter class than its HTTP-method default. */
export const RateLimit = (cls: RateLimitClass) => SetMetadata(RATE_LIMIT_CLASS, cls);

/** Exempts a handler or controller (health probes). */
export const SkipRateLimit = () => SetMetadata(RATE_LIMIT_SKIP, true);

/** `/mcp` keeps its own limiter, so it is exempt by path rather than by decorator. */
export function isExemptPath(path: string | undefined): boolean {
  const p = (path ?? "").split("?")[0];
  return p === "/mcp" || p.startsWith("/mcp/");
}
