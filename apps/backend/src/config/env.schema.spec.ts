import { describe, expect, it } from "vitest";
import { EnvValidationError, PRODUCTION_REQUIRED, parseBackendEnv } from "./env.schema";

const PROD = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://u:p@db.internal:5432/flump",
  CORS_ALLOWED_ORIGINS: "https://app.example.invalid",
  MCP_AUDIT_HMAC_KEY: "k".repeat(32),
  WORKOS_CLIENT_ID: "client_123",
  BANKING_TOKEN_ENCRYPTION_KEY: "b".repeat(64),
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
    expect(issues).toEqual([{ variable: name, problem: "is required in production" }]);
  });

  it("accepts DB_HOST in place of DATABASE_URL in production", () => {
    expect(() =>
      parseBackendEnv({ ...PROD, DATABASE_URL: undefined, DB_HOST: "db.internal" }),
    ).not.toThrow();
  });

  it("refuses a short MCP_AUDIT_HMAC_KEY in production only", () => {
    expect(issuesOf({ ...PROD, MCP_AUDIT_HMAC_KEY: "short" })[0]?.variable).toBe(
      "MCP_AUDIT_HMAC_KEY",
    );
    expect(() => parseBackendEnv({ MCP_AUDIT_HMAC_KEY: "short" })).not.toThrow();
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
