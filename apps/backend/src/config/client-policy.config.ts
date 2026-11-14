import type { ClientPolicyResponse } from "@flump/api-contract";

type Env = Record<string, string | undefined>;

/** No minimum: every client version is at or above it. */
export const NO_MINIMUM_VERSION = "0.0.0";

/** One to three dotted numbers, as the contract's ClientVersion. */
const VERSION = /^\d{1,5}(\.\d{1,5}){0,2}$/;

/** A missing or malformed value falls back to no minimum, so a typo can never lock clients out. */
function versionFrom(value: string | undefined): string {
  const trimmed = value?.trim().replace(/^v/i, "") ?? "";
  return VERSION.test(trimmed) ? trimmed : NO_MINIMUM_VERSION;
}

/**
 * The supported mobile client versions (E12 B-A), read from `CLIENT_POLICY_<PLATFORM>_MIN_VERSION`
 * and `CLIENT_POLICY_<PLATFORM>_RECOMMENDED_VERSION`. Raising a minimum is a variable change and a
 * restart of the service, with no code change.
 */
export function readClientPolicy(env: Env): ClientPolicyResponse {
  const platform = (name: "IOS" | "ANDROID") => ({
    minVersion: versionFrom(env[`CLIENT_POLICY_${name}_MIN_VERSION`]),
    recommendedVersion: versionFrom(env[`CLIENT_POLICY_${name}_RECOMMENDED_VERSION`]),
  });
  return { ios: platform("IOS"), android: platform("ANDROID") };
}
