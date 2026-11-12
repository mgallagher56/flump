import type { INestApplication } from "@nestjs/common";
import { json } from "express";
import helmet from "helmet";
import { resolveCorsOrigins } from "./cors.config";

export const DEFAULT_JSON_LIMIT = "1mb";
/** Tax-record routes receive base64 receipts, so they get a larger body limit. */
export const TAX_JSON_LIMIT = "8mb";
export const TAX_ROUTE_PREFIX = "/tax-records";

export function parseTrustProxyHops(raw: string | undefined): number | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) {
    throw new Error(`TRUST_PROXY_HOPS must be a non-negative integer, got "${value}"`);
  }
  return Number(value);
}

/**
 * `TRUST_PROXY_HOPS` overrides; otherwise 1 hop when on Railway (RAILWAY_ENVIRONMENT) or
 * NODE_ENV=production, else unset. Railway terminates TLS at one edge proxy: without
 * trusting it, req.ip is the proxy for every client. SECURITY: a hop count is only safe
 * behind Railway's edge, which overwrites the client-supplied X-Forwarded-For; elsewhere a
 * client can spoof its IP and evade the failed-auth limiter.
 */
export function resolveTrustProxyHops(env: Record<string, string | undefined>): number | undefined {
  const explicit = parseTrustProxyHops(env.TRUST_PROXY_HOPS);
  if (explicit !== undefined) return explicit;
  return env.RAILWAY_ENVIRONMENT || env.NODE_ENV === "production" ? 1 : undefined;
}

/**
 * CORS, security headers, body limits and proxy trust for the JSON API.
 * The Nest app must be created with `bodyParser: false`: the parsers below
 * replace the default one (tax route first so its larger limit wins).
 */
export function applySecurity(
  app: INestApplication,
  env: Record<string, string | undefined>,
): void {
  const origins = resolveCorsOrigins(env);
  const trustProxyHops = resolveTrustProxyHops(env);

  const instance = app.getHttpAdapter().getInstance();
  instance.disable("x-powered-by");
  if (trustProxyHops !== undefined) instance.set("trust proxy", trustProxyHops);

  app.enableCors({ origin: origins, credentials: false });
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      strictTransportSecurity: { maxAge: 15552000, includeSubDomains: true },
      xContentTypeOptions: true,
      referrerPolicy: { policy: "no-referrer" },
      xPoweredBy: false,
    }),
  );
  app.use(TAX_ROUTE_PREFIX, json({ limit: TAX_JSON_LIMIT }));
  app.use(json({ limit: DEFAULT_JSON_LIMIT }));
}
