import { isProduction } from "./env.schema";

type Raw = Record<string, string | undefined>;

/**
 * Privacy variables production should set but does not yet require (BE-15, findings N1 and N2).
 * Boot does not fail without them, so a deploy before the owner sets them keeps every other route
 * working; SEC-A moves them into PRODUCTION_REQUIRED once they are set. Until then each one unset in
 * production is logged once at boot and counted in `/health/ready` `configWarnings`.
 */
export const PRIVACY_PRODUCTION_VARIABLES = [
  /** Account deletion refuses with `account_deletion_unavailable` while unset. */
  "DELETION_TOMBSTONE_KEY",
  /** The signed client-IP header cannot be verified, so rate limits fall back to the proxy IP. */
  "WEB_CLIENT_IP_HMAC_KEY",
  /** An erasure removes the data but the WorkOS login stays: `identity_pending` for good (N2). */
  "WORKOS_API_KEY",
  /** Terms acceptance answers `terms_not_configured` while unset (M-PRIV3). */
  "TERMS_VERSION",
] as const;
export type PrivacyProductionVariable = (typeof PRIVACY_PRODUCTION_VARIABLES)[number];

/**
 * Same rule as `resolveTombstoneKey` in `modules/privacy/tombstone-key.ts`: a key shorter than 32
 * characters is refused there, so it counts as unset here. Duplicated because platform code
 * may not import `src/modules` (module-boundaries law).
 */
const MIN_TOMBSTONE_KEY_LENGTH = 32;

/** The privacy variables unset in production, in a fixed order. Empty outside production. */
export function privacyConfigWarnings(env: Raw): PrivacyProductionVariable[] {
  if (!isProduction(env)) return [];
  return PRIVACY_PRODUCTION_VARIABLES.filter((name) =>
    name === "DELETION_TOMBSTONE_KEY"
      ? (env[name] ?? "").length < MIN_TOMBSTONE_KEY_LENGTH
      : (env[name]?.trim() ?? "") === "",
  );
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
