import type { NextFunction, Request, Response } from "express";

/** Version prefix for the stable API surface (E21 phase 2). The unversioned routes keep working. */
export const API_VERSION_PREFIX = "/v1";

const V1_PATTERN = /^\/v1(?=\/|\?|$)/i;

/**
 * Sunset date (RFC 8594, an HTTP date) for the unversioned aliases. Null until the clients have
 * moved to /v1 (BE-10) and a date is announced (docs/api/versioning.md); then set it and every
 * deprecated response also carries a `Sunset` header.
 */
export const UNVERSIONED_SUNSET: string | null = null;

/**
 * Unversioned paths that are not deprecated: health probes (Railway and uptime checks call them
 * by path) and the MCP endpoint, which AI clients are configured with.
 */
const NOT_DEPRECATED = /^\/(health(\/ready)?|mcp)\/?$/i;

/**
 * Deprecation headers for a response (docs/api/versioning.md): `Deprecation: true`, a `Link` to
 * the successor on /v1, and `Sunset` once a date is set.
 */
export function setDeprecationHeaders(
  res: { setHeader(name: string, value: string): unknown },
  successorPath: string,
): void {
  res.setHeader("Deprecation", "true");
  res.setHeader("Link", `<${successorPath}>; rel="successor-version"`);
  if (UNVERSIONED_SUNSET) res.setHeader("Sunset", UNVERSIONED_SUNSET);
}

/**
 * Strips a leading `/v1` from the request URL so `/v1/accounts` is served by the same handler as
 * `/accounts`. Mounted before the body parsers and every route so per-route limits, guards and the
 * contract interceptor see the canonical path. `originalUrl` is left untouched for logging.
 * A request on an unversioned path is answered with deprecation headers pointing at /v1 (the path
 * only, never the query string); a /v1 request is not.
 */
export function v1AliasMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (V1_PATTERN.test(req.url)) {
    req.url = req.url.replace(V1_PATTERN, "") || "/";
    if (req.url.startsWith("?")) req.url = `/${req.url}`;
  } else {
    const path = req.url.split("?")[0] ?? "/";
    if (path !== "/" && !NOT_DEPRECATED.test(path)) {
      setDeprecationHeaders(res, `${API_VERSION_PREFIX}${path}`);
    }
  }
  next();
}
