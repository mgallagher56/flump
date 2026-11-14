import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/**
 * Signed client IP from the web server (BE-07, M9). The web server is one IP to the backend, so
 * without this every web user shares the per-IP bucket. The web `/api` proxy and backend client
 * send the browser's address with an HMAC over the address and a timestamp; the backend keys the
 * per-IP ceiling on it only when the signature and freshness check pass, else on the socket IP.
 *
 * Headers (the web side is apps/web/app/services/client-ip.server.ts; keep them in step):
 *   x-flump-client-ip:     the address, as the web server's trusted proxy reported it
 *   x-flump-client-ip-sig: v1=<unix seconds>.<hex HMAC-SHA256(key, "v1|<ip>|<seconds>")>
 *
 * A captured header replays only within the freshness window, and all it can do is pick whose
 * bucket a request counts against. The key is `WEB_CLIENT_IP_HMAC_KEY`, shared with the web
 * service; with it unset or short the header is ignored.
 */
export const CLIENT_IP_HEADER = "x-flump-client-ip";
export const CLIENT_IP_SIG_HEADER = "x-flump-client-ip-sig";
export const CLIENT_IP_KEY_ENV = "WEB_CLIENT_IP_HMAC_KEY";
/** How far a signature's timestamp may be from now, either way, in seconds. */
const CLIENT_IP_MAX_SKEW_SECONDS = 60;
const CLIENT_IP_MIN_KEY_LENGTH = 32;

const SIG_FORMAT = /^v1=(\d{1,12})\.([0-9a-f]{64})$/;

/** The key, or null (with the reason, naming the variable only) when unset or too short. */
export function resolveClientIpHmacKey(env: Record<string, string | undefined>): {
  key: string | null;
  warning?: string;
} {
  const key = env[CLIENT_IP_KEY_ENV]?.trim();
  if (!key) {
    return {
      key: null,
      warning: `${CLIENT_IP_KEY_ENV} is not set: web requests share the web server's per-IP rate limit.`,
    };
  }
  if (key.length < CLIENT_IP_MIN_KEY_LENGTH) {
    return {
      key: null,
      warning: `${CLIENT_IP_KEY_ENV} is shorter than ${CLIENT_IP_MIN_KEY_LENGTH} characters and is ignored.`,
    };
  }
  return { key };
}

export function signClientIp(key: string, ip: string, nowMs = Date.now()): string {
  const seconds = Math.floor(nowMs / 1000);
  const mac = createHmac("sha256", key).update(`v1|${ip}|${seconds}`).digest("hex");
  return `v1=${seconds}.${mac}`;
}

const single = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/**
 * The signed client address when the headers carry a valid, fresh signature; otherwise null.
 * Never throws. A repeated header (an array) is refused.
 */
export function verifiedClientIp(
  headers: Record<string, unknown> | undefined,
  key: string | null,
  nowMs = Date.now(),
): string | null {
  if (!key || !headers) return null;
  const ip = single(headers[CLIENT_IP_HEADER])?.trim();
  // SIG_FORMAT (below) is anchored with bounded, unnested quantifiers: matching is linear.
  // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos
  const sig = single(headers[CLIENT_IP_SIG_HEADER])?.trim();
  if (!ip || !sig || ip.length > 64 || isIP(ip) === 0) return null;
  const match = SIG_FORMAT.exec(sig);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (Math.abs(nowMs / 1000 - seconds) > CLIENT_IP_MAX_SKEW_SECONDS) return null;
  const expected = createHmac("sha256", key).update(`v1|${ip}|${seconds}`).digest();
  const given = Buffer.from(match[2] as string, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected) ? ip : null;
}
