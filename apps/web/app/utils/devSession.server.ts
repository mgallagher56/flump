/**
 * Test-only cookie session for the Playwright smoke suite (apps/e2e). It lets `/login` and
 * `/logout` work without a real WorkOS tenant, and it can never be enabled in production:
 *
 * - it needs `E2E_DEV_SESSION=true` AND the existing dev bypass (`AUTH_DEV_BYPASS=true` with
 *   `NODE_ENV=development`);
 * - any other environment where the flag is set throws, and `auth.server.ts` evaluates this at
 *   module load, so a misconfigured deployment refuses to boot instead of silently opening up;
 * - it is also refused when `RAILWAY_ENVIRONMENT` or `WORKOS_API_KEY` is set, mirroring the
 *   backend's `resolveAuthMode`.
 *
 * Error messages name variables only, never values. Server-only: this module holds no token.
 */

export const DEV_SESSION_COOKIE = "flump_dev_session";

export function isDevSessionEnabled(env: Record<string, string | undefined>): boolean {
  if (env.E2E_DEV_SESSION !== "true") return false;
  if (env.NODE_ENV !== "development") {
    throw new Error("E2E_DEV_SESSION is only permitted when NODE_ENV is development");
  }
  if (env.AUTH_DEV_BYPASS !== "true") {
    throw new Error("E2E_DEV_SESSION requires AUTH_DEV_BYPASS=true");
  }
  if (env.RAILWAY_ENVIRONMENT) {
    throw new Error("E2E_DEV_SESSION is not permitted when RAILWAY_ENVIRONMENT is set");
  }
  if (env.WORKOS_API_KEY) {
    throw new Error("E2E_DEV_SESSION must not be combined with WORKOS_API_KEY");
  }
  return true;
}

export function hasDevSessionCookie(request: Request): boolean {
  const header = request.headers.get("cookie") ?? "";
  return header.split(";").some((part) => part.trim() === `${DEV_SESSION_COOKIE}=1`);
}

export const devSessionSetCookie = `${DEV_SESSION_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax`;
export const devSessionClearCookie = `${DEV_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
