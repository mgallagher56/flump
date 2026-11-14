import { randomBytes } from "node:crypto";
import { createContext } from "react-router";

type Env = Record<string, string | undefined>;

/**
 * The full, nonce-bearing Content Security Policy (E20-N11 report-only soak, enforced by BE-07 for
 * audit M8). It replaces the `frame-ancestors 'none'`-only default from `SECURITY_HEADERS` on HTML
 * documents (the policy carries `frame-ancestors 'none'` itself), so a document has exactly one
 * `Content-Security-Policy` header. Violations still report: `report-uri` (every browser) and
 * `report-to` with a `Reporting-Endpoints` header (Reporting API browsers) both point at
 * `/csp-report`.
 *
 * Rollback: `CSP_REPORT_ONLY=true` (exactly) sends the same policy as
 * `Content-Security-Policy-Report-Only` again, and the enforced `frame-ancestors 'none'` default
 * comes back on its own. Any other value, or unset, enforces.
 */
export const ENFORCED_CSP_HEADER = "Content-Security-Policy";
export const REPORT_ONLY_CSP_HEADER = "Content-Security-Policy-Report-Only";

/** The header the full policy goes out under (see the rollback note above). */
export function fullCspHeaderName(env: Env = process.env): string {
  return env.CSP_REPORT_ONLY === "true" ? REPORT_ONLY_CSP_HEADER : ENFORCED_CSP_HEADER;
}

/** Same-origin endpoint that receives violation reports (`routes/csp-report.ts`). */
export const CSP_REPORT_PATH = "/csp-report";

/** The `report-to` group name, declared by `Reporting-Endpoints` on the same response. */
export const CSP_REPORT_GROUP = "csp-endpoint";
export const REPORTING_ENDPOINTS = `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;

/** Per-request nonce, written by the root middleware and read by `entry.server.tsx`. */
export const nonceContext = createContext<string>("");

/** 128 random bits, base64url (CSP `nonce-` values allow `-` and `_`). */
export function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Only plain `scheme://host[:port]` origins may enter a policy. The URL parser accepts characters
 * such as `;` and `,` in a host, which would end a directive or start a second policy, so the
 * normalised origin is re-checked; IPv6 literals and anything else are dropped (never thrown).
 */
const SAFE_ORIGIN = /^https?:\/\/[A-Za-z0-9.-]+(:\d+)?$/;

function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const origin = new URL(value).origin;
    return SAFE_ORIGIN.test(origin) ? origin : null;
  } catch {
    return null;
  }
}

/**
 * The exact Sentry ingest origin (`https://oNNN.ingest.de.sentry.io`) taken from `SENTRY_DSN`,
 * which is already public through `window.ENV`. Only scheme and host are used (never the key in
 * the userinfo or the project id in the path). https only. `null` (no `connect-src` entry at all)
 * when the DSN is unset or invalid.
 */
export function sentryConnectOrigin(env: Env): string | null {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    return url.protocol === "https:" ? toOrigin(`${url.protocol}//${url.host}`) : null;
  } catch {
    return null;
  }
}

/**
 * Exact origins a form submission (or its redirect chain) may land on: WorkOS (the logout form
 * posts to `/logout`, which redirects to the WorkOS logout endpoint and then to the marketing
 * site) and the marketing site. No wildcards. `WORKOS_API_HOSTNAME` is the same variable authkit
 * reads for a non-default API host.
 */
export function formActionOrigins(env: Env, marketingUrl: string): string[] {
  const workos = toOrigin(`https://${env.WORKOS_API_HOSTNAME?.trim() || "api.workos.com"}`);
  const origins = [workos, toOrigin(marketingUrl)].filter((o): o is string => o !== null);
  return [...new Set(origins)];
}

export interface CspOptions {
  nonce: string;
  /** Extra exact origins for `form-action`, after `'self'`. */
  formActionOrigins: readonly string[];
  /** Extra exact origins for `connect-src` (the Sentry ingest origin, when configured). */
  connectOrigins?: readonly string[];
  /** Adds `upgrade-insecure-requests` (production only: local http would be upgraded too). */
  upgradeInsecureRequests?: boolean;
}

/** The full policy. `script-src` carries the nonce and never `'unsafe-inline'`. */
export function buildCsp({
  nonce,
  formActionOrigins: formOrigins,
  connectOrigins = [],
  upgradeInsecureRequests = false,
}: CspOptions): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self' ${connectOrigins.join(" ")}`.trim(),
    `form-action 'self' ${formOrigins.join(" ")}`.trim(),
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    ...(upgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,
  ];
  return directives.join("; ");
}

/**
 * Sets the full CSP and its `Reporting-Endpoints` on a response (set, never append: one header,
 * one nonce). Enforced, it overwrites the `frame-ancestors`-only default of the same name.
 */
export function applyFullCsp(
  response: Response,
  options: CspOptions,
  env: Env = process.env,
): Response {
  const set = (headers: Headers) => {
    headers.set(fullCspHeaderName(env), buildCsp(options));
    headers.set("Reporting-Endpoints", REPORTING_ENDPOINTS);
  };
  try {
    set(response.headers);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    set(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}
