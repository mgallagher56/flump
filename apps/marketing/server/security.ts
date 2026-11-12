type Env = Record<string, string | undefined>;

const RAILWAY_WEB_URL = "https://web-production-845e6c.up.railway.app";

/**
 * Resolves the app URL once at boot. The Host header is never consulted: it is request
 * controlled, and the value is injected into the HTML and into SSR links.
 */
export function resolveAppUrl(env: Env = process.env): string {
  if (env.VITE_APP_URL) return env.VITE_APP_URL;
  if (env.APP_URL) return env.APP_URL;
  if (env.NODE_ENV !== "production") return "http://localhost:5173";
  if (env.RAILWAY_PUBLIC_DOMAIN) return RAILWAY_WEB_URL;
  return "https://app.flump.co.uk";
}

interface CspOptions {
  isProd: boolean;
  /** Per-request nonce; required in production. */
  nonce?: string;
}

/**
 * Production: all scripts are same-origin or carry the nonce, and the marketing site makes
 * no cross-origin fetches, so script-src and connect-src are tight. Development keeps the
 * relaxed policy Vite HMR needs (inline and eval scripts, websockets).
 */
export function buildCsp({ isProd, nonce }: CspOptions): string {
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:";
  const connectSrc = isProd ? "connect-src 'self'" : "connect-src 'self' https: ws:";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    connectSrc,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Logs the error server-side and returns the only body a client may see. */
export function genericServerError(
  err: unknown,
  log: (...args: unknown[]) => void = console.error,
): string {
  log("Raw SSR Error:", err);
  return "Internal Server Error";
}

/**
 * Validates SECURITY_CONTACT: an email (becomes mailto:), a mailto: URI or an https URL.
 * Anything else, including whitespace or control characters (header-injection into the file),
 * returns null so the file is not served.
 */
export function normaliseSecurityContact(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return null;
  if (/^https:\/\/[^/]+/i.test(value)) return value;
  if (/^mailto:[^@]+@[^@]+\.[^@]+$/i.test(value)) return value;
  if (/^[^@:/]+@[^@/:]+\.[^@/:]+$/.test(value)) return `mailto:${value}`;
  return null;
}

/** RFC 9116 security.txt body. Expires one year after `now`. */
export function buildSecurityTxt(contact: string, now: Date): string {
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return [
    `Contact: ${contact}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    "Policy: https://flump.co.uk/security",
    "Canonical: https://flump.co.uk/.well-known/security.txt",
    "",
  ].join("\n");
}

const THEME_MARKER = "<script data-flump-theme>";

/** Adds the CSP nonce attribute to the inline theme script. `nonceAttr` is ` nonce="..."` or "". */
export function injectThemeNonce(template: string, nonceAttr: string): string {
  return template.replace(THEME_MARKER, `<script${nonceAttr}>`);
}

export { THEME_MARKER };
