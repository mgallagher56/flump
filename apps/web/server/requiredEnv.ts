/**
 * Variables the web server refuses to start without in production (SEC-A, finding M9).
 *
 * `WEB_CLIENT_IP_HMAC_KEY` signs each browser's address on backend calls
 * (app/services/client-ip.server.ts). Without it the backend sees one address, the web server's,
 * and every web user shares one per-IP rate-limit bucket. The backend requires the same key in
 * production; the two services must hold the same value.
 *
 * Outside production (development, test, the E2E run) the key stays optional and no header is sent.
 */
export const CLIENT_IP_KEY_ENV = "WEB_CLIENT_IP_HMAC_KEY";
const MIN_KEY_LENGTH = 32;

/** Throws naming the variable, never its value. `server/env.ts` has already defaulted NODE_ENV. */
export function assertProductionEnv(env: Record<string, string | undefined>): void {
  // Trimmed, as the backend does (config/env.schema.ts), so the two services agree on "production".
  if (env.NODE_ENV?.trim() !== "production") return;
  const key = env[CLIENT_IP_KEY_ENV]?.trim() ?? "";
  if (key === "") {
    throw new Error(`${CLIENT_IP_KEY_ENV} is required in production.`);
  }
  if (key.length < MIN_KEY_LENGTH) {
    throw new Error(`${CLIENT_IP_KEY_ENV} must be at least ${MIN_KEY_LENGTH} characters.`);
  }
}
