import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuditEvent } from "../src/entities/audit-event.entity";
import { BudgetEntry } from "../src/entities/budget-entry.entity";
import { resolveDbTestMode } from "../src/testing/dbTestMode";
import { type AuthzHarness, bootAuthzHarness, type HttpMethod, USER_A } from "./authz/support";

// Migrations run on boot; see test/authz/support.ts.
vi.mock("../src/config/typeorm.options", async (importOriginal) =>
  (await import("./authz/support.js")).withMigrations(await importOriginal()),
);

/**
 * BE-15: the real AppModule booted the way main.ts boots it (validateBootEnv, request context,
 * applySecurity) in a production-shaped environment on real Postgres: NODE_ENV=production on
 * Railway, every PRODUCTION_REQUIRED variable set, and the four privacy variables
 * (DELETION_TOMBSTONE_KEY, WEB_CLIENT_IP_HMAC_KEY, WORKOS_API_KEY, TERMS_VERSION) unset. Proves the
 * service degrades exactly as documented (account deletion and terms acceptance refuse with their
 * own 503 codes) and nothing else breaks. Auth is the authz harness's real WorkOsJwtVerifier on a
 * throwaway JWKS; no guard is weakened.
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
  CORS_ALLOWED_ORIGINS: "https://example.invalid",
  BETA_OPEN: "true",
  // Production closes AI connections to an allow-list (MCP_OPEN_ACCESS defaults to false there).
  MCP_ALLOWED_USER_IDS: USER_A,
  MCP_OPEN_ACCESS: undefined,
  DELETION_TOMBSTONE_KEY: undefined,
  WEB_CLIENT_IP_HMAC_KEY: undefined,
  WORKOS_API_KEY: undefined,
  TERMS_VERSION: undefined,
  BANK_CONNECTIONS_ENABLED: undefined,
  CONTRACT_MODE: undefined,
  TRUST_PROXY_HOPS: undefined,
};

const BUCKET_KEY = /^rl1:[0-9a-f]{32}$/;

describe.skipIf(dbMode === "skip")("production-shaped environment (real Postgres)", () => {
  let h: AuthzHarness;
  const savedEnv = { ...process.env };
  const statuses: string[] = [];
  let entryId: string;

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

  it("boots, and /health/ready is 200 with the four privacy variables counted", async () => {
    const res = await h.call("get", "/health/ready");
    statuses.push(`${res.status} GET /health/ready`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.configWarnings).toBe(4);
  });

  it("an ordinary rate-limited write succeeds", async () => {
    const res = await call("post", "/budget-entries", {
      category: "housing",
      name: "Rent",
      amount: 900,
    });
    expect(res.status).toBe(201);
    entryId = res.body.id;
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

  it("account deletion refuses with account_deletion_unavailable and deletes nothing", async () => {
    const bucketsBefore = await bucketKeys();
    const res = await call("delete", "/user-profile", { confirmation: "DELETE" });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ code: "account_deletion_unavailable" });
    expect(typeof res.body.message).toBe("string");
    expect(typeof res.body.requestId).toBe("string");
    // Not the rate limiter: its refusals are 429 rate_limited or a 503 with another code, and the
    // destructive hit went through the shared store (a bucket row exists for it).
    expect(res.headers["retry-after"]).toBeUndefined();
    expect((await bucketKeys()).length).toBeGreaterThanOrEqual(bucketsBefore.length);
    expect(await budgetRows()).toBe(1);
    const entry = await h.dataSource.getRepository(BudgetEntry).findOneBy({ id: entryId });
    expect(entry?.userId).toBe(USER_A);
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
