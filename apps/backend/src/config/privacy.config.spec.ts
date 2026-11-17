import { describe, expect, it } from "vitest";
import { PRODUCTION_REQUIRED, parseBackendEnv } from "./env.schema";
import {
  PRIVACY_PRODUCTION_VARIABLES,
  privacyConfigWarnings,
  privacyWarningMessage,
  resolveTermsVersion,
} from "./privacy.config";

describe("privacyConfigWarnings (BE-15; SEC-A)", () => {
  it("warns about TERMS_VERSION only: the three keys are boot requirements now (SEC-A)", () => {
    expect(privacyConfigWarnings({ NODE_ENV: "production" })).toEqual(["TERMS_VERSION"]);
    expect(PRIVACY_PRODUCTION_VARIABLES).toEqual(["TERMS_VERSION"]);
    for (const name of ["DELETION_TOMBSTONE_KEY", "WEB_CLIENT_IP_HMAC_KEY", "WORKOS_API_KEY"]) {
      expect(PRODUCTION_REQUIRED).toContain(name);
    }
  });

  it("treats blank as unset and says nothing once it is set", () => {
    expect(privacyConfigWarnings({ NODE_ENV: "production", TERMS_VERSION: "   " })).toEqual([
      "TERMS_VERSION",
    ]);
    expect(privacyConfigWarnings({ NODE_ENV: "production", TERMS_VERSION: "2026-11-01" })).toEqual(
      [],
    );
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

  it("TERMS_VERSION stays optional at production boot", () => {
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

/** A production env with every PRODUCTION_REQUIRED variable and no TERMS_VERSION. */
function productionBase(): Record<string, string> {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://u:p@db.example.test/x",
    CORS_ALLOWED_ORIGINS: "https://app.example.test",
    MCP_AUDIT_HMAC_KEY: "m".repeat(32),
    WORKOS_CLIENT_ID: "client_test",
    BANKING_TOKEN_ENCRYPTION_KEY: "b".repeat(32),
    RECEIPT_ENCRYPTION_KEY: "r".repeat(32),
    DELETION_TOMBSTONE_KEY: "t".repeat(32),
    WEB_CLIENT_IP_HMAC_KEY: "h".repeat(32),
    WORKOS_API_KEY: "w".repeat(32),
  };
}
