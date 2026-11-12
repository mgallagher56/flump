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
