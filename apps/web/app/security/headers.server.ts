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

/**
 * Returns the response with the security headers set. Mutates in place when the headers are
 * writable; otherwise (e.g. a `Response.redirect`) returns a copy with the same body and status.
 */
export function applySecurityHeaders(response: Response): Response {
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}
