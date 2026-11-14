import { describe, expect, it } from "vitest";
import { parseBackendEnv } from "./env.schema";
import {
  PRIVACY_PRODUCTION_VARIABLES,
  privacyConfigWarnings,
  privacyWarningMessage,
  resolveTermsVersion,
} from "./privacy.config";

describe("privacyConfigWarnings (BE-15, N1 and N2)", () => {
  it("names every unset privacy variable in production, in a fixed order", () => {
    expect(privacyConfigWarnings({ NODE_ENV: "production" })).toEqual([
      "DELETION_TOMBSTONE_KEY",
      "WEB_CLIENT_IP_HMAC_KEY",
      "WORKOS_API_KEY",
      "TERMS_VERSION",
    ]);
  });

  it("treats blank as unset and leaves out the ones that are set", () => {
    expect(
      privacyConfigWarnings({
        NODE_ENV: "production",
        DELETION_TOMBSTONE_KEY: "t".repeat(48),
        WEB_CLIENT_IP_HMAC_KEY: "   ",
        WORKOS_API_KEY: "w".repeat(40),
        TERMS_VERSION: "2026-11-01",
      }),
    ).toEqual(["WEB_CLIENT_IP_HMAC_KEY"]);
  });

  it("counts a tombstone key shorter than 32 characters as unset, like resolveTombstoneKey", () => {
    const base = {
      NODE_ENV: "production",
      WEB_CLIENT_IP_HMAC_KEY: "h".repeat(40),
      WORKOS_API_KEY: "w".repeat(40),
      TERMS_VERSION: "2026-11-01",
    };
    expect(privacyConfigWarnings({ ...base, DELETION_TOMBSTONE_KEY: "t".repeat(31) })).toEqual([
      "DELETION_TOMBSTONE_KEY",
    ]);
    expect(privacyConfigWarnings({ ...base, DELETION_TOMBSTONE_KEY: "t".repeat(32) })).toEqual([]);
  });

  it("says nothing outside production", () => {
    expect(privacyConfigWarnings({ NODE_ENV: "development" })).toEqual([]);
    expect(privacyConfigWarnings({})).toEqual([]);
  });

  it("logs the variable name and the owner doc, never a value", () => {
    for (const name of PRIVACY_PRODUCTION_VARIABLES) {
      const message = privacyWarningMessage(name);
      expect(message).toContain(name);
      expect(message).toContain("OWNER-SETUP.md");
    }
  });

  it("are none of them production-required yet (SEC-A makes them required later)", () => {
    expect(() => parseBackendEnv(productionBase())).not.toThrow();
  });
});

describe("resolveTermsVersion (M-PRIV3)", () => {
  it("is null when unset or blank, else the trimmed version", () => {
    expect(resolveTermsVersion({})).toBeNull();
    expect(resolveTermsVersion({ TERMS_VERSION: "  " })).toBeNull();
    expect(resolveTermsVersion({ TERMS_VERSION: " 2026-11-01 " })).toBe("2026-11-01");
  });

  it("is optional at boot but must be a short identifier when set", () => {
    expect(() => parseBackendEnv({ TERMS_VERSION: "2026-11-01" })).not.toThrow();
    expect(() => parseBackendEnv({ TERMS_VERSION: "v1 (Nov 2026)" })).toThrow(/TERMS_VERSION/);
  });
});

/** A production env with every PRODUCTION_REQUIRED variable and none of the privacy ones. */
function productionBase(): Record<string, string> {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://u:p@db.example.test/x",
    CORS_ALLOWED_ORIGINS: "https://app.example.test",
    MCP_AUDIT_HMAC_KEY: "m".repeat(32),
    WORKOS_CLIENT_ID: "client_test",
    BANKING_TOKEN_ENCRYPTION_KEY: "b".repeat(32),
  };
}
