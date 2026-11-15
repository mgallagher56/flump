import { isProduction } from "./env.schema";

type Raw = Record<string, string | undefined>;

/**
 * Privacy variables production should set but does not require (BE-15). Boot does not fail without
 * them; each one unset in production is logged once at boot and counted in `/health/ready`
 * `configWarnings`.
 *
 * SEC-A moved `DELETION_TOMBSTONE_KEY`, `WEB_CLIENT_IP_HMAC_KEY` and `WORKOS_API_KEY` out of this
 * list into `PRODUCTION_REQUIRED` (env.schema.ts): production no longer boots without them, so
 * they can never be a warning.
 */
export const PRIVACY_PRODUCTION_VARIABLES = [
  /** Terms acceptance answers `terms_not_configured` while unset (M-PRIV3). */
  "TERMS_VERSION",
] as const;
export type PrivacyProductionVariable = (typeof PRIVACY_PRODUCTION_VARIABLES)[number];

/** The privacy variables unset in production, in a fixed order. Empty outside production. */
export function privacyConfigWarnings(env: Raw): PrivacyProductionVariable[] {
  if (!isProduction(env)) return [];
  return PRIVACY_PRODUCTION_VARIABLES.filter((name) => (env[name]?.trim() ?? "") === "");
}

/** The boot log line for one unset variable. Names the variable, never a value. */
export function privacyWarningMessage(name: PrivacyProductionVariable): string {
  return `${name} is not set in production. See docs/audit/backend-2026-11/OWNER-SETUP.md (BE-04 / BE-15).`;
}

/** Nest token for the current terms version (string), or null when TERMS_VERSION is unset. */
export const TERMS_VERSION_CONFIG = "TERMS_VERSION_CONFIG";

/**
 * The terms and privacy notice version people accept (M-PRIV3), read once at boot. The env schema
 * has already checked its shape (validateBootEnv in main.ts). Null means terms acceptance is off.
 */
export function resolveTermsVersion(env: Raw): string | null {
  const value = env.TERMS_VERSION?.trim() ?? "";
  return value === "" ? null : value;
}
