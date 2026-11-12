/**
 * Decides the auth mode at boot. Pure: env is a parameter. Fails closed:
 * with neither WorkOS config nor an explicit, safe dev bypass it throws.
 * Error messages name variables only, never values.
 */
export function resolveAuthMode(env: Record<string, string | undefined>): "workos" | "dev" {
  if (env.AUTH_DEV_BYPASS === "true") {
    if (env.NODE_ENV !== "development") {
      throw new Error("AUTH_DEV_BYPASS is only permitted when NODE_ENV is development");
    }
    if (env.RAILWAY_ENVIRONMENT) {
      throw new Error("AUTH_DEV_BYPASS is not permitted when RAILWAY_ENVIRONMENT is set");
    }
    if (env.WORKOS_API_KEY) {
      throw new Error("AUTH_DEV_BYPASS must not be combined with WORKOS_API_KEY");
    }
    return "dev";
  }
  if (env.WORKOS_CLIENT_ID) {
    return "workos";
  }
  throw new Error(
    "Authentication is not configured: set WORKOS_CLIENT_ID, or AUTH_DEV_BYPASS=true in development",
  );
}
