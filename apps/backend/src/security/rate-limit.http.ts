import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { logUserRef } from "./keyed-ref";
import type { RateLimitDecision } from "./rate-limit.store";

const logger = new Logger("RateLimit");

/**
 * Logs the route template and a keyed reference to the user (`logUserRef`, BE-15 S6): never the
 * WorkOS user id, the URL, the body or the token.
 */
export function rejectRateLimited(
  res: { setHeader(name: string, value: string): unknown },
  decision: RateLimitDecision,
  routeTemplate: string,
  userId?: string,
): never {
  res.setHeader("Retry-After", String(decision.retryAfterSeconds));
  logger.warn(
    `ratelimit_exceeded route=${routeTemplate}${userId ? ` userRef=${logUserRef(userId)}` : ""} retryAfter=${decision.retryAfterSeconds}`,
  );
  throw new HttpException(
    { code: "rate_limited", message: "Too many requests. Try again later." },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
