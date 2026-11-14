import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getClientIp } from "~/security/request-id.server";

/**
 * Signed client IP for backend calls (BE-07, M9). The web server is one IP to the backend, so
 * without this every web user shares the backend's per-IP bucket. Every server-side call to the
 * backend made on behalf of a browser request sends these headers; the backend keys its per-IP
 * ceiling on the address only when the HMAC and timestamp verify
 * (apps/backend/src/security/signed-client-ip.ts; keep the two in step).
 *
 *   x-flump-client-ip:     the browser's address
 *   x-flump-client-ip-sig: v1=<unix seconds>.<hex HMAC-SHA256(key, "v1|<ip>|<seconds>")>
 *
 * The key is `WEB_CLIENT_IP_HMAC_KEY`, the same value on the web and backend services. Unset, or
 * shorter than 32 characters, no headers are sent and the backend keys on the web server's IP.
 */
export const CLIENT_IP_HEADER = "x-flump-client-ip";
export const CLIENT_IP_SIG_HEADER = "x-flump-client-ip-sig";
export const CLIENT_IP_KEY_ENV = "WEB_CLIENT_IP_HMAC_KEY";
const MIN_KEY_LENGTH = 32;

/**
 * The browser's address: the last `X-Forwarded-For` entry, the one the single trusted proxy
 * (Railway, `trust proxy` 1 in `server/app.ts`) appended; earlier entries are client-supplied.
 * Null when there is no usable address (local dev, direct access).
 */
export function clientIpFromRequest(request: Request): string | null {
  const last = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (!last || last.length > 64) return null;
  return isIP(last) === 0 ? null : last;
}

/** Signed headers for `ip`, or nothing when the key is missing or `ip` is not an address. */
export function signedHeadersForIp(
  ip: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
  nowMs: number = Date.now(),
): Record<string, string> {
  const key = env[CLIENT_IP_KEY_ENV]?.trim();
  if (!key || key.length < MIN_KEY_LENGTH) return {};
  if (!ip || ip.length > 64 || isIP(ip) === 0) return {};
  const seconds = Math.floor(nowMs / 1000);
  const mac = createHmac("sha256", key).update(`v1|${ip}|${seconds}`).digest("hex");
  return { [CLIENT_IP_HEADER]: ip, [CLIENT_IP_SIG_HEADER]: `v1=${seconds}.${mac}` };
}

/**
 * Headers to add to a backend call made for `request`: the signed client address, or nothing
 * when the key or the address is missing. Never throws.
 */
export function signedClientIpHeaders(
  request: Request,
  env: Record<string, string | undefined> = process.env,
  nowMs: number = Date.now(),
): Record<string, string> {
  return signedHeadersForIp(clientIpFromRequest(request), env, nowMs);
}

/**
 * `headers` plus the signed address of the current request (held by the server middleware in the
 * request context), for backend calls that have no Request to hand (`backend-client.server.ts`).
 * Unchanged outside a request, without the key, or when the caller already set the header.
 */
export function withClientIpHeaders(
  headers: Record<string, string>,
  env: Record<string, string | undefined> = process.env,
  nowMs: number = Date.now(),
): Record<string, string> {
  if (Object.keys(headers).some((k) => k.toLowerCase() === CLIENT_IP_HEADER)) return headers;
  return { ...headers, ...signedHeadersForIp(getClientIp(), env, nowMs) };
}
