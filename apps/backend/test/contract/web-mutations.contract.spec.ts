import "reflect-metadata";
import { type INestApplication, Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../../src/app.module";
import { DEV_BYPASS_TOKEN } from "../../src/auth/dev-bypass.verifier";
import { assertSafeTestDatabase } from "../../src/testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../src/testing/dbTestMode";
import {
  ACCOUNT_CREATE_PAYLOADS,
  ACCOUNT_UPDATE_PAYLOADS,
  BUDGET_CATEGORY_PAYLOAD,
  BUDGET_CREATE_PAYLOAD,
  BUDGET_FIELDS_NOT_PERSISTED,
  BUDGET_UPDATE_PAYLOAD,
  ONBOARDING_ACCOUNTS,
  ONBOARDING_BUDGET_ENTRIES,
  ONBOARDING_COMPLETE,
  ONBOARDING_PROFILE,
  PROFILE_FIELDS_NOT_PERSISTED,
} from "./web-payloads";

// The real option builder, except that migrations are passed as classes and run on boot: the glob
// in typeOrmOptionsFromEnv uses native import, which cannot parse .ts under vitest. The classes are
// discovered from src/migrations, so a new migration cannot be silently skipped. Entities, the
// connection and the rest of AppModule are untouched.
vi.mock("../../src/config/typeorm.options", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/config/typeorm.options")>();
  // Imported inside the factory: vi.mock is hoisted above top-level imports.
  const { discoverMigrations } = await import("../../src/testing/discoverMigrations.js");
  const migrations = await discoverMigrations();
  return {
    ...actual,
    typeOrmOptionsFromEnv: (env: Parameters<typeof actual.typeOrmOptionsFromEnv>[0]) => ({
      ...actual.typeOrmOptionsFromEnv(env),
      migrations,
      migrationsRun: true,
    }),
  };
});

/**
 * Web-to-backend contract test on real Postgres (E23 section 9.3, B2).
 *
 * Boots the real AppModule (real controllers, services, TypeORM and migrations) and replays the
 * exact bodies apps/web sends. Asserts 2xx and that the GET round trip returns what was sent.
 *
 * Run locally against a throwaway database (these tests DROP the public schema):
 *   docker run --rm -d --name flump-e23-pg -e POSTGRES_PASSWORD=postgres \
 *     -e POSTGRES_DB=flump_e23_test -p 55432:5432 postgres:18-alpine
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e23_test \
 *     REQUIRE_DB_TESTS=1 bunx vitest run test/contract
 * Skipped when TEST_DATABASE_URL is unset, unless REQUIRE_DB_TESTS=1 (CI), which fails instead.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const AUTH = { Authorization: `Bearer ${DEV_BYPASS_TOKEN}` };

const omit = <T extends object>(source: T, keys: readonly string[]) =>
  Object.fromEntries(Object.entries(source).filter(([k]) => !keys.includes(k)));

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "web mutations contract (real Postgres)",
  () => {
    let app: INestApplication;
    let dataSource: DataSource;
    // Shadow-mode violations (E21) seen while the web payloads are replayed.
    const shadowViolations = new Set<string>();
    const savedEnv = { ...process.env };

    beforeAll(async () => {
      // Before any connection or schema drop.
      assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);

      process.env.NODE_ENV = "development";
      process.env.AUTH_DEV_BYPASS = "true";
      delete process.env.WORKOS_API_KEY;
      process.env.DATABASE_URL = TEST_DATABASE_URL;
      process.env.DB_SSL = "false";
      process.env.DB_SYNCHRONIZE = "false";

      // Empty schema; the app then runs the real migrations on boot (migrationsRun, see the mock).
      // Same host/port/db fields as typeOrmOptionsFromEnv (the query string is rejected above), never
      // the raw URL.
      const target = new URL(TEST_DATABASE_URL as string);
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

      const warn = Logger.prototype.warn;
      vi.spyOn(Logger.prototype, "warn").mockImplementation(function (this: Logger, ...args) {
        try {
          const entry = JSON.parse(String(args[0]));
          if (entry.event === "contract_violation") {
            for (const issue of entry.issues) {
              shadowViolations.add(`${entry.routeId} ${entry.part} ${issue.path} ${issue.code}`);
            }
          }
        } catch {
          // not a contract log line
        }
        return warn.apply(this, args as never);
      });

      // Module factories read process.env at compile(), after the env above is in place.
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication({ rawBody: true });
      await app.init();
      dataSource = app.get(DataSource);
    }, 60_000);

    afterAll(async () => {
      // E21 shadow validator: the only mismatches between web payloads and the contract schemas
      // are the fields the backend drops. Shrink-only: remove entries as web or backend are fixed.
      expect([...shadowViolations].sort()).toEqual(
        [
          "budget.create body contractEndDate unrecognized_keys",
          "budget.create body isDefault unrecognized_keys",
          "budget.create body isPrimaryIncome unrecognized_keys",
          "budget.update body contractEndDate unrecognized_keys",
          ...PROFILE_FIELDS_NOT_PERSISTED.map(
            (field) => `profile.update body ${field} unrecognized_keys`,
          ),
        ].sort(),
      );
      await app?.close();
      for (const key of Object.keys(process.env)) {
        if (!(key in savedEnv)) delete process.env[key];
      }
      Object.assign(process.env, savedEnv);
    });

    beforeEach(async () => {
      await dataSource.query(
        "TRUNCATE accounts, account_details, transactions, bank_connections, budget_entries, tax_records, user_profiles, mcp_tokens CASCADE",
      );
    });

    const api = () => request(app.getHttpServer());
    const get = (path: string) => api().get(path).set(AUTH);
    const send = (method: "post" | "patch" | "delete", path: string, body?: object) => {
      const req = api()[method](path).set(AUTH);
      return body ? req.send(body) : req;
    };

    const expect2xx = (res: request.Response, what: string) => {
      expect(
        res.status,
        `${what}: ${res.status} ${JSON.stringify(res.body)}`,
      ).toBeGreaterThanOrEqual(200);
      expect(res.status, `${what}: ${res.status} ${JSON.stringify(res.body)}`).toBeLessThan(300);
    };

    describe("decimal columns (E21 numeric transformer, audit B-05)", () => {
      it("returns every decimal as a number and keeps null as null", async () => {
        const created = await send("post", "/accounts", {
          name: "Saver",
          type: "Saving",
          balance: 1204.5,
          interestRate: 4.25,
        });
        expect2xx(created, "POST /accounts");
        expect(created.body.balance).toBe(1204.5);
        expect(created.body.interestRate).toBe(4.25);
        expect(created.body.monthlyContribution).toBeNull();

        const updated = await send("patch", `/accounts/${created.body.id}`, { balance: 10.1 });
        expect2xx(updated, "PATCH /accounts/:id");
        expect(updated.body.balance).toBe(10.1);

        const detailsRows = (await get("/account-details")).body as Array<Record<string, unknown>>;
        for (const row of detailsRows) expect(typeof row.value).toBe("number");

        const tax = await send("post", "/tax-records", {
          type: "income",
          source: "paye",
          category: "salary",
          name: "Pay",
          amount: 2500.75,
          date: "2026-04-30",
        });
        expect2xx(tax, "POST /tax-records");
        expect(tax.body.amount).toBe(2500.75);
        const taxList = (await get("/tax-records")).body as Array<Record<string, unknown>>;
        expect(taxList.map((r) => r.amount)).toEqual([2500.75]);

        const tx = await send("post", "/transactions", {
          accountId: created.body.id,
          amount: -12.34,
          description: "Coffee",
          category: "food",
        });
        expect2xx(tx, "POST /transactions");
        expect(tx.body.amount).toBe(-12.34);
      });
    });

    describe("onboarding", () => {
      it("accepts the profile, 4 accounts and 3 budget entries onboarding sends, and round-trips them", async () => {
        expect2xx(await send("patch", "/user-profile", ONBOARDING_PROFILE), "PATCH /user-profile");

        for (const account of ONBOARDING_ACCOUNTS) {
          expect2xx(await send("post", "/accounts", account), `POST /accounts ${account.name}`);
        }
        for (const entry of ONBOARDING_BUDGET_ENTRIES) {
          expect2xx(
            await send("post", "/budget-entries", entry),
            `POST /budget-entries ${entry.name}`,
          );
        }
        expect2xx(
          await send("patch", "/user-profile", ONBOARDING_COMPLETE),
          "PATCH /user-profile (complete)",
        );

        const profile = (await get("/user-profile")).body;
        expect(profile).toMatchObject({
          ...omit(ONBOARDING_PROFILE, PROFILE_FIELDS_NOT_PERSISTED),
          onboardingCompleted: true,
        });
        expect(typeof profile.annualSalary).toBe("number");
        expect(typeof profile.monthlyTakeHome).toBe("number");

        const accounts = (await get("/accounts")).body as Array<Record<string, unknown>>;
        expect(accounts).toHaveLength(ONBOARDING_ACCOUNTS.length);
        for (const sent of ONBOARDING_ACCOUNTS) {
          const stored = accounts.find((a) => a.name === sent.name);
          expect(stored, `account ${sent.name} stored`).toMatchObject(sent);
          expect(typeof stored?.balance).toBe("number");
        }

        const entries = (await get("/budget-entries")).body as Array<Record<string, unknown>>;
        expect(entries).toHaveLength(ONBOARDING_BUDGET_ENTRIES.length);
        for (const sent of ONBOARDING_BUDGET_ENTRIES) {
          const stored = entries.find((e) => e.name === sent.name);
          expect(stored, `entry ${sent.name} stored`).toMatchObject(sent);
          expect(typeof stored?.amount).toBe("number");
        }
      });

      // D02b: the web sends these but the backend has no column, so they vanish on save.
      // When the backend persists a field, remove it from PROFILE_FIELDS_NOT_PERSISTED.
      it("documents the onboarding profile fields the backend still drops (D02b)", async () => {
        expect2xx(await send("patch", "/user-profile", ONBOARDING_PROFILE), "PATCH /user-profile");
        const profile = (await get("/user-profile")).body;
        for (const field of PROFILE_FIELDS_NOT_PERSISTED) {
          expect(
            profile[field],
            `${field} is now persisted: remove it from PROFILE_FIELDS_NOT_PERSISTED`,
          ).toBeUndefined();
        }
      });
    });

    describe("accounts", () => {
      for (const [page, createBody] of Object.entries(ACCOUNT_CREATE_PAYLOADS)) {
        it(`creates, updates and deletes as the ${page} sends`, async () => {
          const created = await send("post", "/accounts", createBody);
          expect2xx(created, `POST /accounts (${page})`);
          const id = created.body.id as string;

          const stored = await get(`/accounts/${id}`);
          expect2xx(stored, `GET /accounts/${id}`);
          expect(stored.body).toMatchObject(createBody);
          expect(typeof stored.body.balance).toBe("number");
          if ("interestRate" in createBody) expect(typeof stored.body.interestRate).toBe("number");

          const updateBody = ACCOUNT_UPDATE_PAYLOADS[page as keyof typeof ACCOUNT_UPDATE_PAYLOADS];
          expect2xx(await send("patch", `/accounts/${id}`, updateBody), `PATCH /accounts/${id}`);
          const updated = (await get(`/accounts/${id}`)).body;
          expect(updated).toMatchObject(updateBody);
          expect(typeof updated.balance).toBe("number");

          expect2xx(await send("delete", `/accounts/${id}`), `DELETE /accounts/${id}`);
          expect((await get("/accounts")).body).toEqual([]);
        });
      }

      it("accepts the mortgage page's interest-rate-only PATCH", async () => {
        const created = await send("post", "/accounts", ONBOARDING_ACCOUNTS[2]);
        const id = created.body.id as string;
        expect2xx(
          await send("patch", `/accounts/${id}`, ACCOUNT_UPDATE_PAYLOADS.mortgagePage),
          "PATCH /accounts/:id (mortgage)",
        );
        const stored = (await get(`/accounts/${id}`)).body;
        expect(stored).toMatchObject({ ...ONBOARDING_ACCOUNTS[2], interestRate: 3.99 });
      });
    });

    describe("budget entries", () => {
      it("creates, updates and deletes as the budget table sends", async () => {
        const created = await send("post", "/budget-entries", BUDGET_CREATE_PAYLOAD);
        expect2xx(created, "POST /budget-entries");
        const id = created.body.id as string;
        expect(typeof created.body.amount).toBe("number");

        const listed = (await get("/budget-entries")).body as Array<Record<string, unknown>>;
        expect(listed).toHaveLength(1);
        expect(listed[0]).toMatchObject(omit(BUDGET_CREATE_PAYLOAD, BUDGET_FIELDS_NOT_PERSISTED));
        expect(typeof listed[0].amount).toBe("number");

        const updated = await send("patch", `/budget-entries/${id}`, BUDGET_UPDATE_PAYLOAD);
        expect2xx(updated, `PATCH /budget-entries/${id}`);
        const after = ((await get("/budget-entries")).body as Array<Record<string, unknown>>)[0];
        expect(after).toMatchObject(omit(BUDGET_UPDATE_PAYLOAD, BUDGET_FIELDS_NOT_PERSISTED));
        expect(typeof after.amount).toBe("number");

        expect2xx(await send("delete", `/budget-entries/${id}`), `DELETE /budget-entries/${id}`);
        expect((await get("/budget-entries")).body).toEqual([]);
      });

      // The web sends contractEndDate; the backend has no column for it, so a real date is lost.
      it("documents the budget fields the backend still drops", async () => {
        const created = await send("post", "/budget-entries", BUDGET_CREATE_PAYLOAD);
        const id = created.body.id as string;
        await send("patch", `/budget-entries/${id}`, BUDGET_UPDATE_PAYLOAD);
        const stored = ((await get("/budget-entries")).body as Array<Record<string, unknown>>)[0];
        for (const field of BUDGET_FIELDS_NOT_PERSISTED) {
          expect(
            stored[field],
            `${field} is now persisted: remove it from BUDGET_FIELDS_NOT_PERSISTED`,
          ).toBeUndefined();
        }
      });

      it("accepts a custom category and seeds defaults on explicit request", async () => {
        const category = await send("post", "/budget-entries/categories", BUDGET_CATEGORY_PAYLOAD);
        expect2xx(category, "POST /budget-entries/categories");
        expect(category.body.categories).toContain("pets");

        const seeded = await send("post", "/budget-entries/seed-defaults");
        expect2xx(seeded, "POST /budget-entries/seed-defaults");
        expect((seeded.body as unknown[]).length).toBeGreaterThan(0);
      });
    });
  },
);
