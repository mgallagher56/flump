import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { RateLimitDecision } from "./rate-limit.store";

const logger = new Logger("RateLimit");

/** Logs the route template and user id only: never the URL, body or token. */
export function rejectRateLimited(
  res: { setHeader(name: string, value: string): unknown },
  decision: RateLimitDecision,
  routeTemplate: string,
  userId?: string,
): never {
  res.setHeader("Retry-After", String(decision.retryAfterSeconds));
  logger.warn(
    `ratelimit_exceeded route=${routeTemplate}${userId ? ` user=${userId}` : ""} retryAfter=${decision.retryAfterSeconds}`,
  );
  throw new HttpException(
    { statusCode: 429, error: "rate_limited", message: "Too many requests. Try again later." },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
