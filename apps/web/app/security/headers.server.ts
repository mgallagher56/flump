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
 * Path prefixes whose HTML/`.data` responses hold no personal data and keep their existing
 * caching behaviour. Everything else (the dashboard at `/`, `/app/*`, `/api/*`, `/login`,
 * `/callback`, `/logout`, `/sandbox`, unmatched paths, ...) defaults to `no-store`, so a new
 * route is private until it is listed here.
 */
export const PUBLIC_CACHEABLE_PREFIXES: readonly string[] = ["/tools"];

export function isPublicCacheablePath(pathname: string): boolean {
  const path = pathname.endsWith(".data") ? pathname.slice(0, -".data".length) : pathname;
  return PUBLIC_CACHEABLE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Adds `Cache-Control: no-store` (and `Pragma: no-cache`) to a response on a non-public path.
 * A response that already declares its own Cache-Control (healthz, robots.txt, the API proxy,
 * resource files) is left as the route set it. Static assets are served before the middleware
 * pipeline and never reach this.
 */
export function applyCachePolicy(response: Response, pathname: string): Response {
  if (isPublicCacheablePath(pathname) || response.headers.has("Cache-Control")) return response;
  return withHeaders(response, (headers) => {
    headers.set("Cache-Control", "no-store");
    headers.set("Pragma", "no-cache");
  });
}
