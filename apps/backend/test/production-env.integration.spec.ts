import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { validateBootEnv } from "../src/config/boot-guards";
import { EnvValidationError } from "../src/config/env.schema";
import { AuditEvent } from "../src/entities/audit-event.entity";
import { BudgetEntry } from "../src/entities/budget-entry.entity";
import { resolveDbTestMode } from "../src/testing/dbTestMode";
import { type AuthzHarness, bootAuthzHarness, type HttpMethod, USER_A } from "./authz/support";

// Migrations run on boot; see test/authz/support.ts.
vi.mock("../src/config/typeorm.options", async (importOriginal) =>
  (await import("./authz/support.js")).withMigrations(await importOriginal()),
);

/**
 * BE-15 and SEC-A: the real AppModule booted the way main.ts boots it (validateBootEnv, request
 * context, applySecurity) in a production-shaped environment on real Postgres: NODE_ENV=production
 * on Railway, every PRODUCTION_REQUIRED variable set (DELETION_TOMBSTONE_KEY,
 * WEB_CLIENT_IP_HMAC_KEY and WORKOS_API_KEY among them since SEC-A) and TERMS_VERSION unset. Proves
 * the service boots and works with the terms version off (terms acceptance refuses with its own 503
 * code), and that the same boot check refuses to start when any one of the three keys is missing.
 * Auth is the authz harness's real WorkOsJwtVerifier on a throwaway JWKS; no guard is weakened.
 * Account deletion is not called here: with a WorkOS key set it would reach the real WorkOS API.
 */
const dbMode = resolveDbTestMode(process.env);

// Built at runtime: the repository is public, so no key-shaped literals.
const runtimeValue = (seed: string) => seed.repeat(48);

/** Every PRODUCTION_REQUIRED variable (DATABASE_URL and WORKOS_CLIENT_ID come from the harness). */
const PRODUCTION_ENV: Record<string, string | undefined> = {
  NODE_ENV: "production",
  RAILWAY_ENVIRONMENT: "production",
  RAILWAY_SERVICE_ID: ["svc", "prod", "test"].join("-"),
  MCP_AUDIT_HMAC_KEY: runtimeValue("m"),
  BANKING_TOKEN_ENCRYPTION_KEY: runtimeValue("b"),
  RECEIPT_ENCRYPTION_KEY: runtimeValue("r"),
  CORS_ALLOWED_ORIGINS: "https://example.invalid",
  BETA_OPEN: "true",
  // Production closes AI connections to an allow-list (MCP_OPEN_ACCESS defaults to false there).
  MCP_ALLOWED_USER_IDS: USER_A,
  MCP_OPEN_ACCESS: undefined,
  DELETION_TOMBSTONE_KEY: runtimeValue("t"),
  WEB_CLIENT_IP_HMAC_KEY: runtimeValue("h"),
  WORKOS_API_KEY: runtimeValue("w"),
  TERMS_VERSION: undefined,
  BANK_CONNECTIONS_ENABLED: undefined,
  CONTRACT_MODE: undefined,
  TRUST_PROXY_HOPS: undefined,
};

/** The three keys SEC-A made boot requirements. */
const SEC_A_REQUIRED = [
  "DELETION_TOMBSTONE_KEY",
  "WEB_CLIENT_IP_HMAC_KEY",
  "WORKOS_API_KEY",
] as const;

const BUCKET_KEY = /^rl1:[0-9a-f]{32}$/;

describe.skipIf(dbMode === "skip")("production-shaped environment (real Postgres)", () => {
  let h: AuthzHarness;
  const savedEnv = { ...process.env };
  const statuses: string[] = [];

  const call = async (method: HttpMethod, path: string, body?: object) => {
    const res = await h.call(method, path, h.tokens.a, body);
    statuses.push(`${res.status} ${method.toUpperCase()} ${path}`);
    return res;
  };
  const bucketKeys = async (): Promise<string[]> =>
    ((await h.dataSource.query(`SELECT key FROM rate_limit_buckets`)) as { key: string }[]).map(
      (row) => row.key,
    );
  const budgetRows = () => h.dataSource.getRepository(BudgetEntry).countBy({ userId: USER_A });

  beforeAll(async () => {
    h = await bootAuthzHarness({ env: PRODUCTION_ENV, likeMain: true });
  }, 120_000);

  afterAll(async () => {
    await h?.close();
    // close() restores the environment; also restore it if boot itself failed.
    for (const name of Object.keys(process.env)) {
      if (!(name in savedEnv)) delete process.env[name];
    }
    Object.assign(process.env, savedEnv);
  });

  it("boots with the three keys set and TERMS_VERSION unset; /health/ready counts only that one", async () => {
    expect(process.env.TERMS_VERSION).toBeUndefined();
    const res = await h.call("get", "/health/ready");
    statuses.push(`${res.status} GET /health/ready`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.configWarnings).toBe(1);
  });

  it.each(SEC_A_REQUIRED)("refuses to boot without %s, naming it and printing no value", (name) => {
    // The exact check main.ts runs first, on this spec's real production environment less one key.
    const env = { ...process.env, [name]: undefined };
    let thrown: unknown;
    try {
      validateBootEnv(env);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(EnvValidationError);
    const error = thrown as EnvValidationError;
    expect(error.issues).toEqual([{ variable: name, problem: "is required in production" }]);
    expect(error.message).toBe(`Invalid environment: ${name} is required in production`);
    for (const other of SEC_A_REQUIRED) {
      const value = process.env[other];
      if (value) expect(error.message).not.toContain(value);
    }
  });

  it("refuses to boot with a DELETION_TOMBSTONE_KEY shorter than 32 characters", () => {
    const short = runtimeValue("t").slice(0, 31);
    expect(() => validateBootEnv({ ...process.env, DELETION_TOMBSTONE_KEY: short })).toThrow(
      "Invalid environment: DELETION_TOMBSTONE_KEY must be at least 32 characters in production",
    );
  });

  it("an ordinary rate-limited write succeeds", async () => {
    const res = await call("post", "/budget-entries", {
      category: "housing",
      name: "Rent",
      amount: 900,
    });
    expect(res.status).toBe(201);
    expect(await budgetRows()).toBe(1);
  });

  it("a token mint succeeds, and its shared bucket key is keyed, never the user id", async () => {
    const res = await call("post", "/mcp-tokens", { name: "Agent", expiryDays: 30 });
    expect(res.status).toBe(201);
    expect(typeof res.body.rawToken).toBe("string");
    const keys = await bucketKeys();
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toMatch(BUCKET_KEY);
      expect(key).not.toContain(USER_A);
    }
  });

  it("a destructive write that is not account deletion succeeds", async () => {
    const second = await call("post", "/budget-entries", {
      category: "food",
      name: "Groceries",
      amount: 50,
    });
    expect(second.status).toBe(201);
    const res = await call("delete", `/budget-entries/${second.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await budgetRows()).toBe(1);
  });

  it("terms acceptance refuses with terms_not_configured", async () => {
    const res = await call("post", "/user-profile/terms-acceptance", { version: "2026-11-01" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ code: "terms_not_configured" });
  });

  it("data export succeeds and writes a user.exported audit row", async () => {
    const res = await h.call("get", "/user-profile/export", h.tokens.a).buffer(true);
    statuses.push(`${res.status} GET /user-profile/export`);
    expect(res.status).toBe(200);
    expect(
      await h.dataSource
        .getRepository(AuditEvent)
        .countBy({ userId: USER_A, action: "user.exported" }),
    ).toBe(1);
  });

  it("with no MCP_AUDIT_HMAC_KEY on a non-production Railway service, a destructive hit is allowed", async () => {
    // Read per request (keyed-ref.ts), so changing the environment here reaches the real
    // interceptor and PgRateLimitStore: the shape of a Railway service with another NODE_ENV.
    const errors = vi.spyOn(Logger.prototype, "error");
    const created = await call("post", "/budget-entries", {
      category: "food",
      name: "Lunch",
      amount: 10,
    });
    expect(created.status).toBe(201);
    const keysBefore = new Set(await bucketKeys());
    const saved = {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      MCP_AUDIT_HMAC_KEY: process.env.MCP_AUDIT_HMAC_KEY,
    };
    process.env.NODE_ENV = "development";
    process.env.RAILWAY_ENVIRONMENT = "staging";
    delete process.env.MCP_AUDIT_HMAC_KEY;
    try {
      const res = await call("delete", `/budget-entries/${created.body.id}`);
      expect(res.status).toBe(200);
      const added = (await bucketKeys()).filter((key) => !keysBefore.has(key));
      // A new bucket under the per-process root (the configured key's bucket for this user and
      // class already exists, so a new row means a different root was used).
      expect(added.length).toBeGreaterThan(0);
      for (const key of added) expect(key).toMatch(BUCKET_KEY);
      const keyedRefErrors = errors.mock.calls.filter((args) =>
        String(args[0]).includes("MCP_AUDIT_HMAC_KEY"),
      );
      expect(keyedRefErrors).toHaveLength(1);
    } finally {
      Object.assign(process.env, saved);
      errors.mockRestore();
    }
  });

  it("no response in this spec was a 500 or 502", () => {
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.filter((line) => /^50[02] /.test(line))).toEqual([]);
  });
});

/**
 * SEC-A kept the `account_deletion_unavailable` 503 because a strict environment that is not
 * production can still reach it: here a Railway service whose NODE_ENV is not production, with no
 * DELETION_TOMBSTONE_KEY. Boot succeeds (the key is required only in production) and account
 * deletion fails closed over HTTP, deleting nothing.
 */
describe.skipIf(dbMode === "skip")(
  "strict environment that is not production, no tombstone key (real Postgres)",
  () => {
    let h: AuthzHarness;
    const savedEnv = { ...process.env };

    beforeAll(async () => {
      h = await bootAuthzHarness({
        env: {
          RAILWAY_ENVIRONMENT: "staging",
          // A Railway process must say how the beta is gated (boot guard); open here.
          BETA_OPEN: "true",
          // A Railway service never uses the development banking key (S3).
          BANKING_TOKEN_ENCRYPTION_KEY: runtimeValue("b"),
          MCP_AUDIT_HMAC_KEY: runtimeValue("m"),
          DELETION_TOMBSTONE_KEY: undefined,
        },
        likeMain: true,
      });
    }, 120_000);

    afterAll(async () => {
      await h?.close();
      for (const name of Object.keys(process.env)) {
        if (!(name in savedEnv)) delete process.env[name];
      }
      Object.assign(process.env, savedEnv);
    });

    it("account deletion refuses with account_deletion_unavailable and deletes nothing", async () => {
      expect(process.env.NODE_ENV).not.toBe("production");
      const created = await h.call("post", "/budget-entries", h.tokens.a, {
        category: "housing",
        name: "Rent",
        amount: 900,
      });
      expect(created.status).toBe(201);
      const res = await h.call("delete", "/user-profile", h.tokens.a, { confirmation: "DELETE" });
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ code: "account_deletion_unavailable" });
      expect(typeof res.body.message).toBe("string");
      expect(typeof res.body.requestId).toBe("string");
      // Not the rate limiter: its refusals carry Retry-After.
      expect(res.headers["retry-after"]).toBeUndefined();
      const entry = await h.dataSource
        .getRepository(BudgetEntry)
        .findOneBy({ id: created.body.id });
      expect(entry?.userId).toBe(USER_A);
    });
  },
);
