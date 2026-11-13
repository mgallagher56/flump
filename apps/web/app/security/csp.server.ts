import { randomBytes } from "node:crypto";
import { createContext } from "react-router";

/**
 * Content-Security-Policy-Report-Only (E20-N11). The enforced `Content-Security-Policy:
 * frame-ancestors 'none'` stays in `SECURITY_HEADERS`; this is a SEPARATE, nonce-bearing policy
 * that only reports until E20-N12 enforces it.
 *
 * E20-N12 switch point: `FULL_CSP_HEADER_NAME` is the only place the header name lives. N12 turns
 * it into `CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only"`
 * (and then drops the report-only copy of the frame-ancestors directive from the enforced header).
 */
export const FULL_CSP_HEADER_NAME = "Content-Security-Policy-Report-Only";

/** Same-origin endpoint that receives violation reports (`routes/csp-report.ts`). */
export const CSP_REPORT_PATH = "/csp-report";

/** Per-request nonce, written by the root middleware and read by `entry.server.tsx`. */
export const nonceContext = createContext<string>("");

/** 128 random bits, base64url (CSP `nonce-` values allow `-` and `_`). */
export function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

type Env = Record<string, string | undefined>;

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
}

/** The full policy. `script-src` carries the nonce and never `'unsafe-inline'`. */
export function buildCsp({
  nonce,
  formActionOrigins: formOrigins,
  connectOrigins = [],
}: CspOptions): string {
  return [
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
    `report-uri ${CSP_REPORT_PATH}`,
  ].join("; ");
}

/** Sets the full CSP on a response (set, never append: one header, one nonce). */
export function applyFullCsp(response: Response, options: CspOptions): Response {
  const set = (headers: Headers) => headers.set(FULL_CSP_HEADER_NAME, buildCsp(options));
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
