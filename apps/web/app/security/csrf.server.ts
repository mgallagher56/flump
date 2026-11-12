/**
 * CSRF Origin check (E20-N1). Unsafe methods must prove they come from the app itself:
 * `Origin` equal to the app origin, or `Sec-Fetch-Site: same-origin`. A request carrying
 * neither header is rejected (round 4, open decision 1).
 */

const SAFE_METHODS = new Set(["GET", "HEAD"]);

/**
 * The origin the browser used to reach this app. Behind the platform proxy the public host
 * arrives in `x-forwarded-host`/`x-forwarded-proto`; this is the same logic the `/api/*` proxy
 * has always used (now shared from here, unchanged). Those headers are only as trustworthy as
 * the edge that sets them, and `Sec-Fetch-Site` is a browser-set forbidden header that does not
 * depend on them.
 */
export function expectedOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ||
    url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    url.host;
  return `${proto}://${host}`;
}

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

/** True when the request may proceed. GET and HEAD always pass. */
export function isSameOriginRequest(request: Request): boolean {
  if (isSafeMethod(request.method)) return true;
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "same-origin") return true;
  const origin = request.headers.get("origin");
  return origin !== null && origin === expectedOrigin(request);
}

export function csrfRejection(): Response {
  return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
}
