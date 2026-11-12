import type { NextFunction, Request, Response } from "express";

/** Version prefix for the stable API surface (E21 phase 2). The unversioned routes keep working. */
export const API_VERSION_PREFIX = "/v1";

const V1_PATTERN = /^\/v1(?=\/|\?|$)/;

/**
 * Strips a leading `/v1` from the request URL so `/v1/accounts` is served by the same handler as
 * `/accounts`. Mounted before the body parsers and every route so per-route limits, guards and the
 * contract interceptor see the canonical path. `originalUrl` is left untouched for logging.
 */
export function v1AliasMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (V1_PATTERN.test(req.url)) {
    req.url = req.url.replace(V1_PATTERN, "") || "/";
    if (req.url.startsWith("?")) req.url = `/${req.url}`;
  }
  next();
}
