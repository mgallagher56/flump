import "reflect-metadata";
import { type INestApplication, Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { vi } from "vitest";
import { AppModule } from "../../src/app.module";
import { createTestJwks } from "../../src/auth/testing/test-jwks";
import { TOKEN_VERIFIER } from "../../src/auth/token-verifier";
import { WorkOsJwtVerifier } from "../../src/auth/workos-jwt.verifier";
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
  tokens: { a: string; b: string; expired: string };
  call(method: HttpMethod, path: string, token?: string, body?: object): request.Test;
  close(): Promise<void>;
}

/** Fields an attacker adds to a write body to try to take over or re-parent a row. */
export const probeBody = (victimRowId: string) => ({ id: victimRowId, userId: USER_A });

export async function bootAuthzHarness(): Promise<AuthzHarness> {
  const databaseUrl = process.env.TEST_DATABASE_URL as string;
  // Before any connection or schema drop.
  assertSafeTestDatabase(databaseUrl, process.env);

  const savedEnv = { ...process.env };
  process.env.NODE_ENV = "development";
  process.env.AUTH_DEV_BYPASS = "true"; // lets AuthModule resolve; the verifier is overridden below
  delete process.env.WORKOS_API_KEY;
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

  // The verifier logs every rejected token; keep the matrix output readable.
  vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

  const jwt = await createTestJwks();
  const verifier = new WorkOsJwtVerifier({ jwks: jwt.jwks, issuer: jwt.issuer });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verifier)
    .compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  await app.init();

  const tokens = {
    a: await jwt.sign({ sub: USER_A }),
    b: await jwt.sign({ sub: USER_B }),
    expired: await jwt.sign({ sub: USER_A }, { expiresIn: "-1h" }),
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
    async close() {
      await app.close();
      for (const key of Object.keys(process.env)) {
        if (!(key in savedEnv)) delete process.env[key];
      }
      Object.assign(process.env, savedEnv);
    },
  };
}

export const TRUNCATE_ALL =
  "TRUNCATE accounts, account_details, transactions, bank_connections, budget_entries, tax_records, user_profiles, mcp_tokens CASCADE";
