import { describe, expect, it } from "vitest";
import { EnvValidationError, PRODUCTION_REQUIRED, parseBackendEnv } from "./env.schema";

const PROD = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://u:p@db.internal:5432/flump",
  CORS_ALLOWED_ORIGINS: "https://app.example.invalid",
  MCP_AUDIT_HMAC_KEY: "k".repeat(32),
  WORKOS_CLIENT_ID: "client_123",
  BANKING_TOKEN_ENCRYPTION_KEY: "b".repeat(64),
  RECEIPT_ENCRYPTION_KEY: "r".repeat(64),
  DELETION_TOMBSTONE_KEY: "t".repeat(32),
  WEB_CLIENT_IP_HMAC_KEY: "h".repeat(32),
  WORKOS_API_KEY: "w".repeat(32),
};

function issuesOf(env: Record<string, string | undefined>) {
  try {
    parseBackendEnv(env);
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError);
    return (error as EnvValidationError).issues;
  }
  throw new Error("expected EnvValidationError");
}

describe("parseBackendEnv", () => {
  it("accepts an empty development environment (current defaults keep working)", () => {
    expect(() => parseBackendEnv({ NODE_ENV: "development" })).not.toThrow();
    expect(() => parseBackendEnv({ NODE_ENV: "test" })).not.toThrow();
    expect(() => parseBackendEnv({})).not.toThrow();
  });

  it("types the values it parses and treats blank as unset", () => {
    const env = parseBackendEnv({
      PORT: "4100",
      BETA_OPEN: " TRUE ",
      DB_SLOW_QUERY_MS: "750",
      SENTRY_TRACES_SAMPLE_RATE: "0.25",
      CONTRACT_MODE: "Shadow",
      WEB_ORIGIN: "",
    });
    expect(env.PORT).toBe(4100);
    expect(env.BETA_OPEN).toBe(true);
    expect(env.DB_SLOW_QUERY_MS).toBe(750);
    expect(env.SENTRY_TRACES_SAMPLE_RATE).toBe(0.25);
    expect(env.CONTRACT_MODE).toBe("shadow");
    expect(env.WEB_ORIGIN).toBeUndefined();
  });

  it("accepts a complete production environment", () => {
    expect(parseBackendEnv(PROD).NODE_ENV).toBe("production");
  });

  it.each(PRODUCTION_REQUIRED)("fails production boot without %s, naming it", (name) => {
    const issues = issuesOf({ ...PROD, [name]: undefined });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.variable).toBe(name);
    expect(issues[0]?.problem).toMatch(/^is required in production/);
  });

  it("accepts DB_HOST in place of DATABASE_URL in production", () => {
    expect(() =>
      parseBackendEnv({ ...PROD, DATABASE_URL: undefined, DB_HOST: "db.internal" }),
    ).not.toThrow();
  });

  it("requires the receipt encryption key in production, by the SEC-A rule", () => {
    expect(PRODUCTION_REQUIRED).toContain("RECEIPT_ENCRYPTION_KEY");
    expect(issuesOf({ ...PROD, RECEIPT_ENCRYPTION_KEY: undefined })).toEqual([
      {
        variable: "RECEIPT_ENCRYPTION_KEY",
        problem: "is required in production (or RECEIPT_ENCRYPTION_KEYS)",
      },
    ]);
    expect(() => parseBackendEnv({ ...PROD, RECEIPT_ENCRYPTION_KEY: undefined })).toThrow(
      "Invalid environment: RECEIPT_ENCRYPTION_KEY is required in production (or RECEIPT_ENCRYPTION_KEYS)",
    );
    expect(() => parseBackendEnv({ NODE_ENV: "development" })).not.toThrow();
  });

  it("accepts RECEIPT_ENCRYPTION_KEYS in place of RECEIPT_ENCRYPTION_KEY in production", () => {
    expect(() =>
      parseBackendEnv({
        ...PROD,
        RECEIPT_ENCRYPTION_KEY: undefined,
        RECEIPT_ENCRYPTION_KEYS: `1:${"r".repeat(48)}`,
      }),
    ).not.toThrow();
  });

  it("validates the receipt keyring at boot in production, never echoing key material", () => {
    const shortSecret = "s".repeat(20);
    const malformed = issuesOf({
      ...PROD,
      RECEIPT_ENCRYPTION_KEY: undefined,
      RECEIPT_ENCRYPTION_KEYS: `not-a-keyring-${shortSecret}`,
    });
    expect(malformed.map((i) => i.variable)).toEqual(["RECEIPT_ENCRYPTION_KEYS"]);
    const short = issuesOf({
      ...PROD,
      RECEIPT_ENCRYPTION_KEY: undefined,
      RECEIPT_ENCRYPTION_KEYS: `2:${"r".repeat(48)},1:${shortSecret}`,
    });
    expect(short.map((i) => i.variable)).toEqual(["RECEIPT_ENCRYPTION_KEYS"]);
    for (const issue of [...malformed, ...short]) {
      expect(issue.problem).not.toContain(shortSecret);
      expect(issue.problem).not.toContain("r".repeat(48));
    }
    // Outside production the keyring is not checked at boot.
    expect(() => parseBackendEnv({ RECEIPT_ENCRYPTION_KEYS: "nonsense" })).not.toThrow();
  });

  it("refuses a short MCP_AUDIT_HMAC_KEY in production only", () => {
    expect(issuesOf({ ...PROD, MCP_AUDIT_HMAC_KEY: "short" })[0]?.variable).toBe(
      "MCP_AUDIT_HMAC_KEY",
    );
    expect(() => parseBackendEnv({ MCP_AUDIT_HMAC_KEY: "short" })).not.toThrow();
  });

  it("requires the three SEC-A keys in production (N1, N2, M9)", () => {
    expect(PRODUCTION_REQUIRED).toEqual(
      expect.arrayContaining([
        "DELETION_TOMBSTONE_KEY",
        "WEB_CLIENT_IP_HMAC_KEY",
        "WORKOS_API_KEY",
      ]),
    );
  });

  it("refuses a short DELETION_TOMBSTONE_KEY in production only, without printing it", () => {
    const short = "t".repeat(31);
    expect(issuesOf({ ...PROD, DELETION_TOMBSTONE_KEY: short })).toEqual([
      {
        variable: "DELETION_TOMBSTONE_KEY",
        problem: "must be at least 32 characters in production",
      },
    ]);
    expect(() => parseBackendEnv({ DELETION_TOMBSTONE_KEY: short })).not.toThrow();
    try {
      parseBackendEnv({ ...PROD, DELETION_TOMBSTONE_KEY: short });
    } catch (error) {
      expect((error as Error).message).not.toContain(short);
    }
  });

  it("names every missing SEC-A key at once, and no value from the environment", () => {
    const issues = issuesOf({
      ...PROD,
      DELETION_TOMBSTONE_KEY: undefined,
      WEB_CLIENT_IP_HMAC_KEY: "  ",
      WORKOS_API_KEY: "",
    });
    expect(issues.map((i) => i.variable)).toEqual([
      "DELETION_TOMBSTONE_KEY",
      "WEB_CLIENT_IP_HMAC_KEY",
      "WORKOS_API_KEY",
    ]);
  });

  it("TERMS_VERSION stays optional in production", () => {
    expect(() => parseBackendEnv({ ...PROD, TERMS_VERSION: undefined })).not.toThrow();
  });

  it.each([
    ["PORT", "eighty"],
    ["PORT", "70000"],
    ["DB_PORT", "-1"],
    ["DB_POOL_MAX", "999"],
    ["DB_SSL", "maybe"],
    ["DB_SYNCHRONIZE", "yes"],
    ["DB_SLOW_QUERY_MS", "fast"],
    ["DATABASE_URL", "mysql://h/db"],
    ["SENTRY_DSN", "not a url"],
    ["WEB_ORIGIN", "ftp://x"],
    ["WORKOS_ISSUER", "http://insecure.example"],
    ["MCP_OPEN_ACCESS", "1"],
    ["BETA_OPEN", "yes"],
    ["BANK_CONNECTIONS_ENABLED", "enabled-please"],
    ["CONTRACT_MODE", "enforced"],
    ["LOG_FORMAT", "xml"],
    ["SENTRY_TRACES_SAMPLE_RATE", "2"],
    ["TRUST_PROXY_HOPS", "one"],
    ["BANKING_TOKEN_ENCRYPTION_KEY", "too-short"],
  ])("names %s when it is malformed, without printing the value", (name, value) => {
    const issues = issuesOf({ [name]: value });
    expect(issues.map((i) => i.variable)).toEqual([name]);
    const message = new EnvValidationError(issues).message;
    expect(message).toContain(name);
    expect(message).not.toContain(value);
  });

  it("reports every bad variable at once", () => {
    const issues = issuesOf({ ...PROD, PORT: "x", CORS_ALLOWED_ORIGINS: undefined, DB_SSL: "?" });
    expect(issues.map((i) => i.variable).sort()).toEqual([
      "CORS_ALLOWED_ORIGINS",
      "DB_SSL",
      "PORT",
    ]);
  });

  it("never echoes a secret-looking value from a malformed URL", () => {
    const canary = "postgres-with-password-hunter2";
    const error = (() => {
      try {
        parseBackendEnv({ DATABASE_URL: `${canary}@nowhere` });
      } catch (e) {
        return e as Error;
      }
    })();
    expect(error?.name).toBe("EnvValidationError");
    expect(error?.message).not.toContain("hunter2");
  });
});
