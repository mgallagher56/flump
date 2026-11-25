import { describe, expect, it } from "vitest";
import { parseBackendEnv } from "./env.schema";
import { retiredVariableMessage, retiredVariablesSet } from "./privacy.config";

describe("retired variables (terms acceptance retired TERMS_VERSION)", () => {
  it("names TERMS_VERSION when it is set, in any environment", () => {
    expect(retiredVariablesSet({ TERMS_VERSION: "2026-11-01" })).toEqual(["TERMS_VERSION"]);
    expect(retiredVariablesSet({ NODE_ENV: "production", TERMS_VERSION: "x" })).toEqual([
      "TERMS_VERSION",
    ]);
  });

  it("says nothing when it is unset or blank", () => {
    expect(retiredVariablesSet({})).toEqual([]);
    expect(retiredVariablesSet({ TERMS_VERSION: "   " })).toEqual([]);
  });

  it("logs the name and what to do, never the value", () => {
    const message = retiredVariableMessage("TERMS_VERSION");
    expect(message).toContain("TERMS_VERSION");
    expect(message).toContain("Delete TERMS_VERSION");
    expect(message).not.toContain("2026-11-01");
  });

  it("still boots in production with any old value left in place, or none", () => {
    expect(() => parseBackendEnv(productionBase())).not.toThrow();
    // The old schema refused free text; a retired variable must never fail boot.
    expect(() =>
      parseBackendEnv({ ...productionBase(), TERMS_VERSION: "v1 (Nov 2026)" }),
    ).not.toThrow();
    expect(() =>
      parseBackendEnv({ ...productionBase(), TERMS_VERSION: "2026-11-01" }),
    ).not.toThrow();
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
