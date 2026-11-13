/**
 * Security response headers (E20-N1). Applied by the root middleware to every document,
 * `.data` and resource-route response.
 *
 * HSTS has no `preload` (D8-B). The enforced CSP is `frame-ancestors 'none'` only; the full
 * policy lands later (E20-N11/N12).
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function withHeaders(response: Response, apply: (headers: Headers) => void): Response {
  try {
    apply(response.headers);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    apply(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

/**
 * Returns the response with the security headers set. Mutates in place when the headers are
 * writable; otherwise (e.g. a `Response.redirect`) returns a copy with the same body and status.
 */
export function applySecurityHeaders(response: Response): Response {
  return withHeaders(response, (headers) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  });
}

/**
 * Cache policy for everything that runs through the middleware pipeline (documents, `.data`,
 * resource routes). There is deliberately NO public-cacheable allow-list: the root loader returns
 * the user, profile and access token for every route (including `/tools`) and may append a
 * refreshed session `Set-Cookie`, so every HTML and `.data` response is user-specific. Static
 * assets are served before the middleware and keep their own caching.
 *
 * Rules, in order:
 * 1. A response that sets a cookie is always `no-store`.
 * 2. A route's own Cache-Control is kept only if it already contains `no-store` or `private`.
 *    A weaker value (`public`, `max-age`, ...) is replaced with `no-store`.
 * 3. Anything not marked `no-store` (a kept `private`) gets `Vary: Cookie`, so a cache can never
 *    serve one visitor's response to another.
 *
 * A future cacheable public page needs an explicit, reviewed opt-in (a route that does not load
 * user data plus a change here), never an implicit default.
 */
export function applyCachePolicy(response: Response): Response {
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  const setsCookie = response.headers.getSetCookie().length > 0;
  const keepsOwn = !setsCookie && /\b(no-store|private)\b/i.test(cacheControl);
  const noStore = !keepsOwn || /\bno-store\b/i.test(cacheControl);
  if (keepsOwn && noStore) return response;
  return withHeaders(response, (headers) => {
    if (!keepsOwn) {
      headers.set("Cache-Control", "no-store");
      headers.set("Pragma", "no-cache");
    } else if (!/\bcookie\b/i.test(headers.get("Vary") ?? "")) {
      headers.append("Vary", "Cookie");
    }
  });
}
