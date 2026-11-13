import type { Express } from "express";

/**
 * Server-level hardening that is not a response header set per request.
 *
 * Express advertises itself with `X-Powered-By: Express` unless this is disabled. It tells
 * scanners (ZAP rule 10037) which framework to target and has no use for visitors, so it is
 * switched off before any route or middleware is registered.
 */
export function applyServerHardening(app: Express): void {
  app.disable("x-powered-by");
}
