import type { MiddlewareFunction } from "react-router";
import { csrfRejection, isSameOriginRequest } from "./csrf.server";
import { applySecurityHeaders } from "./headers.server";
import { applyRefreshedCookies } from "./session-cookies.server";

/**
 * Root server middleware (E20-N1, `future.v8_middleware`). Runs for every document, `.data` and
 * resource-route request: rejects cross-origin unsafe requests with 403, then stamps the
 * security headers on whatever response comes back (including the 403). A session refreshed by a
 * loader or action has its `Set-Cookie` appended here once (E20-N2).
 */
export const securityMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  if (!isSameOriginRequest(request)) return applySecurityHeaders(csrfRejection());
  return applySecurityHeaders(applyRefreshedCookies(context, await next()));
};
