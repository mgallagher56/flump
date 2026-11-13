import type { MiddlewareFunction } from "react-router";
import { getMarketingUrl } from "~/utils/marketingUrl";
import {
  applyFullCsp,
  formActionOrigins,
  generateNonce,
  nonceContext,
  sentryConnectOrigin,
} from "./csp.server";
import { csrfRejection, isSameOriginRequest } from "./csrf.server";
import { applyCachePolicy, applySecurityHeaders } from "./headers.server";
import { applyRefreshedCookies } from "./session-cookies.server";

/**
 * Root server middleware (E20-N1, `future.v8_middleware`). Runs for every document, `.data` and
 * resource-route request: rejects cross-origin unsafe requests with 403, then stamps the
 * security headers on whatever response comes back (including the 403) and `Cache-Control:
 * no-store` (see `applyCachePolicy`). A session refreshed by a loader
 * or action has its `Set-Cookie` appended here once (E20-N2).
 *
 * Every request gets a fresh nonce in the router context (read by `entry.server.tsx`). HTML
 * responses also get the nonce-bearing `Content-Security-Policy-Report-Only` (E20-N11), a separate
 * header from the enforced `frame-ancestors` one; `.data` and resource responses have no scripts.
 */
export const securityMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  if (!isSameOriginRequest(request)) return applySecurityHeaders(csrfRejection());
  const nonce = generateNonce();
  context.set(nonceContext, nonce);
  const response = applySecurityHeaders(
    applyCachePolicy(applyRefreshedCookies(context, await next())),
  );
  if (!/\btext\/html\b/i.test(response.headers.get("Content-Type") ?? "")) return response;
  return applyFullCsp(response, {
    nonce,
    formActionOrigins: formActionOrigins(process.env, getMarketingUrl(request.url)),
    connectOrigins: [sentryConnectOrigin(process.env)].filter((o): o is string => o !== null),
  });
};
