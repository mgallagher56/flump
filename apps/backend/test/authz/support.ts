import "reflect-metadata";
import { type INestApplication, Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { vi } from "vitest";
import { AppModule } from "../../src/app.module";
import { DEV_BYPASS_TOKEN } from "../../src/auth/dev-bypass.verifier";
import { createTestJwks } from "../../src/auth/testing/test-jwks";
import { TOKEN_VERIFIER } from "../../src/auth/token-verifier";
import { WorkOsJwtVerifier } from "../../src/auth/workos-jwt.verifier";
import { applySecurity } from "../../src/config/security.config";
import { McpService } from "../../src/mcp.service";
import { RateLimitStore } from "../../src/security/rate-limit.store";
import { assertSafeTestDatabase } from "../../src/testing/assertSafeTestDatabase";

/**
 * Two-user IDOR harness (E20-N22).
 *
 * Boots the real AppModule on TEST_DATABASE_URL with the real WorkOsJwtVerifier (on a throwaway
 * JWKS) in place of the dev bypass, so user_A, user_B and an expired token are real signed JWTs.
 * Pattern copied from test/contract/web-mutations.contract.spec.ts; that file is not edited
 * (E23 owns it). The schema is DROPPED, so the database must be a throwaway:
 *   docker run --rm -d --name flump-pg-test -e POSTGRES_PASSWORD=postgres \
 *     -e POSTGRES_DB=flump_authz_test -p 55432:5432 postgres:18-alpine
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_authz_test \
 *     REQUIRE_DB_TESTS=1 bunx vitest run test/authz
 *
 * Each DB spec file must declare, so migrations run on boot:
 *   vi.mock("../../src/config/typeorm.options", async (orig) =>
 *     (await import("./support.js")).withMigrations(await orig()));
 * because vi.mock only hoists inside the file that calls it.
 */
export const USER_A = "user_A";
export const USER_B = "user_B";

/** A well-formed uuid that no row has, for the "real not-found" baseline. */
export const MISSING_ID = "00000000-0000-4000-8000-000000000000";

/**
 * Wraps typeOrmOptionsFromEnv so migrations are passed as classes and run on boot: the glob in the
 * real builder uses native import, which cannot parse .ts under vitest.
 */
export async function withMigrations<T extends { typeOrmOptionsFromEnv: (env: never) => object }>(
  actual: T,
): Promise<T> {
  const { discoverMigrations } = await import("../../src/testing/discoverMigrations.js");
  const migrations = await discoverMigrations();
  return {
    ...actual,
    typeOrmOptionsFromEnv: (env: never) => ({
      ...actual.typeOrmOptionsFromEnv(env),
      migrations,
      migrationsRun: true,
    }),
  };
}

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface AuthzHarness {
  app: INestApplication;
  dataSource: DataSource;
  /** `stale`: user B, signed in an hour ago (fails the recent-login check). */
  tokens: { a: string; b: string; stale: string; expired: string; dev: string };
  call(method: HttpMethod, path: string, token?: string, body?: object): request.Test;
  /** Per-user and per-IP limits (tokenMint 5/h, destructive 10/h) would otherwise 429 the matrix. */
  resetRateLimits(): void;
  close(): Promise<void>;
}

/** Fields an attacker adds to a write body to try to take over or re-parent a row. */
export const probeBody = (victimRowId: string) => ({ id: victimRowId, userId: USER_A });

export async function bootAuthzHarness(): Promise<AuthzHarness> {
  const databaseUrl = process.env.TEST_DATABASE_URL as string;
  // Before any connection or schema drop.
  assertSafeTestDatabase(databaseUrl, process.env);

  const savedEnv = { ...process.env };
  // Real "workos" auth mode (no dev bypass anywhere, including /mcp); the verifier is then
  // replaced by one on a throwaway JWKS. The client id is a placeholder, never contacted.
  process.env.NODE_ENV = "test";
  delete process.env.AUTH_DEV_BYPASS;
  delete process.env.RAILWAY_ENVIRONMENT;
  delete process.env.WORKOS_API_KEY;
  process.env.WORKOS_CLIENT_ID = "client_test";
  // The closed-beta allowlist would 403 both users.
  delete process.env.BETA_ALLOWED_EMAILS;
  delete process.env.BETA_ALLOWED_USER_IDS;
  process.env.DATABASE_URL = databaseUrl;
  process.env.DB_SSL = "false";
  process.env.DB_SYNCHRONIZE = "false";

  const target = new URL(databaseUrl);
  const reset = new DataSource({
    type: "postgres",
    host: target.hostname.replace(/^\[|\]$/g, ""),
    port: target.port ? Number(target.port) : 5432,
    username: decodeURIComponent(target.username),
    password: decodeURIComponent(target.password),
    database: decodeURIComponent(target.pathname.replace(/^\//, "")),
  });
  await reset.initialize();
  await reset.query("DROP SCHEMA public CASCADE");
  await reset.query("CREATE SCHEMA public");
  await reset.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await reset.destroy();

  // The verifier logs every rejected token; keep the matrix output readable. Contract response
  // violations (E21) are collected instead: every 2xx body the matrix sees must match the contract.
  const responseViolations = new Set<string>();
  const warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation((message) => {
    const violation = parseResponseViolation(message);
    for (const line of violation) responseViolations.add(line);
  });

  const jwt = await createTestJwks();
  const verifier = new WorkOsJwtVerifier({ jwks: jwt.jwks, issuer: jwt.issuer });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verifier)
    .compile();
  // As main.ts: bodyParser off, then the real security setup (which mounts the /v1 alias).
  const app = moduleRef.createNestApplication({ bodyParser: false });
  applySecurity(app, { NODE_ENV: process.env.NODE_ENV });
  await app.init();
  // The harness is only meaningful if the real verifier is in front of every route.
  if (!(app.get(TOKEN_VERIFIER) instanceof WorkOsJwtVerifier)) {
    throw new Error("authz harness: TOKEN_VERIFIER is not WorkOsJwtVerifier");
  }

  const rateLimitStore = app.get(RateLimitStore);
  const mcpHandler = app.get(McpService).getHttpHandler() as unknown as {
    failedAuthLimiter: { entries: Map<string, unknown> };
  };

  // auth_time = now: a fresh sign-in, so the recent-login check on destructive routes passes.
  const authTime = Math.floor(Date.now() / 1000);
  const tokens = {
    a: await jwt.sign({ sub: USER_A, auth_time: authTime }),
    b: await jwt.sign({ sub: USER_B, auth_time: authTime }),
    stale: await jwt.sign({ sub: USER_B, auth_time: authTime - 3600 }),
    expired: await jwt.sign({ sub: USER_A }, { expiresIn: "-1h" }),
    dev: DEV_BYPASS_TOKEN,
  };

  return {
    app,
    dataSource: app.get(DataSource),
    tokens,
    call(method, path, token, body) {
      let req = request(app.getHttpServer())[method](path);
      if (token) req = req.set("Authorization", `Bearer ${token}`);
      return body ? req.send(body) : req;
    },
    resetRateLimits() {
      (rateLimitStore as unknown as { buckets: Map<string, unknown> }).buckets.clear();
      // /mcp has its own failed-auth limiter (10 failures a minute per IP, cleared at most once
      // per window), so a test that expects several 401s starts from an empty one.
      mcpHandler.failedAuthLimiter.entries.clear();
    },
    async close() {
      await app.close();
      warnSpy.mockRestore();
      for (const key of Object.keys(process.env)) {
        if (!(key in savedEnv)) delete process.env[key];
      }
      Object.assign(process.env, savedEnv);
      if (responseViolations.size > 0) {
        throw new Error(
          `contract response violations (E21):\n${[...responseViolations].sort().join("\n")}`,
        );
      }
    },
  };
}

/**
 * `routeId path code` lines from a `contract_response_violation` log line (E21), else none. Shared
 * by the authz and contract suites so both fail on a 2xx body that breaks the contract.
 */
export function parseResponseViolation(message: unknown): string[] {
  // A crash inside the checker means the body was never checked: fail on it too.
  if (String(message).startsWith("contract response check failed")) return [String(message)];
  try {
    const entry = JSON.parse(String(message));
    if (entry?.event !== "contract_response_violation") return [];
    return (entry.issues as Array<{ path: string; code: string }>).map(
      (issue) => `${entry.routeId} ${issue.path} ${issue.code}`,
    );
  } catch {
    return [];
  }
}

/** Empties every entity table (derived from the entity metadata, so a new entity is included). */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const tables = dataSource.entityMetadatas.map((m) => `"${m.tableName}"`).join(", ");
  await dataSource.query(`TRUNCATE ${tables} CASCADE`);
}
