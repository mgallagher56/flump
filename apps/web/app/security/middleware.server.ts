import type { MiddlewareFunction } from "react-router";
import { csrfRejection, isSameOriginRequest } from "./csrf.server";
import { applySecurityHeaders } from "./headers.server";

/**
 * Root server middleware (E20-N1, `future.v8_middleware`). Runs for every document, `.data` and
 * resource-route request: rejects cross-origin unsafe requests with 403, then stamps the
 * security headers on whatever response comes back (including the 403).
 */
export const securityMiddleware: MiddlewareFunction<Response> = async ({ request }, next) => {
  if (!isSameOriginRequest(request)) return applySecurityHeaders(csrfRejection());
  return applySecurityHeaders(await next());
};
