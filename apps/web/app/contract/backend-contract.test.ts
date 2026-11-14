// @vitest-environment node
/**
 * Web-to-backend contract tests.
 *
 * Runs the web app's real route actions and payload builders against the REAL backend (the Nest
 * app started from apps/backend/src/main.ts, real controllers, real TypeORM, real Postgres). The
 * backend unit specs use an in-memory repository, which hides database constraints and route
 * registration gaps (a missing currency, a wrong field name, an unregistered PATCH). This suite
 * exists to catch exactly those.
 *
 * Needs a throwaway Postgres, for example:
 *   docker run --rm -d --name flump-contract-pg -e POSTGRES_PASSWORD=postgres \
 *     -e POSTGRES_DB=flump_contract_test -p 55433:5432 postgres:16-alpine
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55433/flump_contract_test \
 *     bun run test -- contract
 * Skipped when TEST_DATABASE_URL is unset, unless REQUIRE_DB_TESTS=1 (CI), where it fails
 * instead. It creates and drops its own `<database>_contract` database on that server.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import {
  AccountListResponse,
  BudgetEntryListResponse,
  BudgetEntryResponse,
  CreateAccountResponse,
  DeleteBudgetEntryResponse,
} from "@flump/api-contract";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Actions need the real `data` and `redirect`; the global setup stubs parts of react-router.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const DEV_TOKEN = "mock-session-token";
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ accessToken: "mock-session-token", user: { id: "dev_user_123" } }),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));

import type { ContractSchema } from "@flump/api-client";
import { apiConfig } from "~/config.server";
import { backendFetch, backendFetchAll } from "~/services/backend-client.server";
import { buildOnboardingSeedJobs } from "~/services/onboarding-seed";
import { action as accountsAction } from "../routes/app.accounts._index";
import { action as debtAction } from "../routes/app.debt";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// Same contract as apps/backend/src/testing/dbTestMode.ts (not imported: the web tsconfig is a
// separate composite project). A missing URL skips locally and fails where REQUIRE_DB_TESTS=1.
function resolveDbTestMode(env: Record<string, string | undefined>): "run" | "skip" {
  if (env.TEST_DATABASE_URL) return "run";
  if (env.REQUIRE_DB_TESTS === "1") {
    throw new Error(
      "REQUIRE_DB_TESTS=1 but TEST_DATABASE_URL is not set; contract tests would be skipped.",
    );
  }
  return "skip";
}

// The suite creates and drops `<database>_contract`: refuse anything that is not a local, test-named database.
function assertSafeTestDatabase(url: string): void {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
    throw new Error(`Refusing destructive DB tests: host "${parsed.hostname}" is not local.`);
  }
  if (!/test/i.test(database)) {
    throw new Error(
      `Refusing destructive DB tests: database "${database}" is not named like a test database.`,
    );
  }
}
const repoRoot = path.resolve(__dirname, "../../../..");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "web to backend contract (real backend, real Postgres)",
  () => {
    let backend: ChildProcess;
    let backendLog = "";
    let baseUrl = "";

    const freePort = () =>
      new Promise<number>((resolve, reject) => {
        const srv = createServer();
        srv.listen(0, "127.0.0.1", () => {
          const { port } = srv.address() as { port: number };
          srv.close(() => resolve(port));
        });
        srv.on("error", reject);
      });

    // The backend migration suite drops the schema of TEST_DATABASE_URL and runs in parallel, so
    // this suite works in its own database on the same server, created fresh and dropped after.
    const contractUrl = (() => {
      const url = new URL(TEST_DATABASE_URL ?? "postgres://localhost/unused");
      url.pathname = `${url.pathname}_contract`;
      return url.toString();
    })();
    const contractDb = decodeURIComponent(new URL(contractUrl).pathname.slice(1));

    const withClient = async (url: string, fn: (client: any) => Promise<void>) => {
      const requireFromBackend = createRequire(path.join(repoRoot, "apps/backend/package.json"));
      const { Client } = requireFromBackend("pg");
      const client = new Client({ connectionString: url });
      await client.connect();
      try {
        await fn(client);
      } finally {
        await client.end();
      }
    };

    const dropDatabase = () =>
      withClient(TEST_DATABASE_URL as string, async (c) => {
        await c.query(`DROP DATABASE IF EXISTS "${contractDb}" WITH (FORCE)`);
      });

    const createDatabase = async () => {
      await dropDatabase();
      await withClient(TEST_DATABASE_URL as string, async (c) => {
        await c.query(`CREATE DATABASE "${contractDb}"`);
      });
      await withClient(contractUrl, async (c) => {
        await c.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      });
    };

    beforeAll(async () => {
      assertSafeTestDatabase(TEST_DATABASE_URL as string);
      await createDatabase();
      const port = await freePort();
      baseUrl = `http://127.0.0.1:${port}`;
      backend = spawn("bun", [path.join(repoRoot, "apps/backend/src/main.ts")], {
        cwd: path.join(repoRoot, "apps/backend"),
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          NODE_ENV: "development",
          AUTH_DEV_BYPASS: "true",
          DB_SYNCHRONIZE: "true",
          DATABASE_URL: contractUrl,
          PORT: String(port),
        },
      });
      backend.stdout?.on("data", (d) => {
        backendLog += d;
      });
      backend.stderr?.on("data", (d) => {
        backendLog += d;
      });

      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        try {
          const res = await fetch(`${baseUrl}/v1/accounts`, {
            headers: { Authorization: `Bearer ${DEV_TOKEN}` },
          });
          if (res.ok) break;
        } catch {
          // Not listening yet.
        }
        if (backend.exitCode !== null) throw new Error(`backend exited early:\n${backendLog}`);
        await new Promise((r) => setTimeout(r, 300));
      }
      if (Date.now() >= deadline) throw new Error(`backend did not start:\n${backendLog}`);

      apiConfig.apiBaseUrl = baseUrl;
    }, 90_000);

    afterAll(async () => {
      backend?.kill("SIGTERM");
      if (backend && backend.exitCode === null) await new Promise((r) => backend.once("exit", r));
      await dropDatabase();
    });

    const get = <T>(endpoint: string, schema: ContractSchema<T[]>) =>
      backendFetchAll(endpoint, { accessToken: DEV_TOKEN, schema });
    const form = (fields: Record<string, string>) => {
      const body = new FormData();
      for (const [k, v] of Object.entries(fields)) body.set(k, v);
      return new Request("http://localhost/app", { method: "POST", body });
    };
    const run = (action: (args: any) => Promise<any>, fields: Record<string, string>) =>
      action({ request: form(fields), params: {}, context: {} });

    const createAccount = (name: string) =>
      backendFetch("/accounts", {
        accessToken: DEV_TOKEN,
        schema: CreateAccountResponse,
        method: "POST",
        body: { name, type: "Saving", balance: 100, isCurrent: true },
      });

    it("seeds the onboarding baseline accounts and budget entries", async () => {
      const jobs = buildOnboardingSeedJobs({
        cash: 4000,
        pensionPot: 25000,
        mortgageBalance: 180000,
        unsecuredDebt: 2500,
        monthlyTakeHome: 3200,
        housingStatus: "mortgage",
        monthlyHousing: 1100,
        otherOutgoings: 900,
      });
      for (const job of jobs.filter((j) => j.enabled)) {
        const post = { accessToken: DEV_TOKEN, method: "POST", body: job.payload } as const;
        if (job.endpoint === "/accounts") {
          await backendFetch(job.endpoint, { ...post, schema: CreateAccountResponse });
        } else {
          await backendFetch(job.endpoint, { ...post, schema: BudgetEntryResponse });
        }
      }

      const accounts = await get("/accounts", AccountListResponse);
      expect(accounts.map((a) => a.name)).toEqual(
        expect.arrayContaining([
          "Cash and emergency savings",
          "Workplace and personal pension",
          "Residential Mortgage",
          "Cards and loans baseline",
        ]),
      );
      expect(accounts.every((a) => a.currency === "GBP")).toBe(true);

      const entries = await get("/budget-entries", BudgetEntryListResponse);
      expect(entries.map((e) => e.name)).toEqual(
        expect.arrayContaining([
          "Monthly Take-Home Income",
          "Mortgage Payment",
          "General living and outgoings",
        ]),
      );
    });

    it("creates a debt through the debt route action", async () => {
      await run(debtAction, {
        intent: "createDebt",
        name: "Contract Barclaycard",
        type: "Credit Card",
        balance: "1200",
        interestRate: "",
        monthlyContribution: "30",
      });
      const accounts = await get("/accounts", AccountListResponse);
      expect(accounts.find((a) => a.name === "Contract Barclaycard")?.currency).toBe("GBP");
    });

    it("updates an account with PATCH, as the accounts route and monthly check-in do", async () => {
      const target = await createAccount("Contract PATCH target");
      const result = await run(accountsAction, {
        intent: "update",
        accountId: target.id,
        name: "Contract PATCH target",
        type: "Saving",
        balance: "4321",
      });
      expect(result).not.toMatchObject({ success: false });

      const after = (await get("/accounts", AccountListResponse)).find((a) => a.id === target.id);
      expect(Number(after?.balance)).toBe(4321);
    });

    it("also accepts PUT for account updates", async () => {
      const target = await createAccount("Contract PUT target");
      const res = await fetch(`${baseUrl}/v1/accounts/${target.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${DEV_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ balance: 77 }),
      });
      expect(res.status).toBe(200);
      expect(Number((await res.json()).balance)).toBe(77);
    });

    it("creates, updates and deletes budget entries with the BudgetContainer payloads", async () => {
      const created = await backendFetch("/budget-entries", {
        accessToken: DEV_TOKEN,
        method: "POST",
        schema: BudgetEntryResponse,
        body: {
          name: "Gym",
          category: "living",
          amount: 40,
          isIncome: false,
          frequency: "monthly",
        },
      });
      expect(created).toMatchObject({ name: "Gym", amount: 40 });

      const updated = await backendFetch(`/budget-entries/${created.id}`, {
        accessToken: DEV_TOKEN,
        schema: BudgetEntryResponse,
        method: "PATCH",
        body: { name: "Gym membership", amount: 45 },
      });
      expect(updated).toMatchObject({ name: "Gym membership", amount: 45 });

      await backendFetch(`/budget-entries/${created.id}`, {
        accessToken: DEV_TOKEN,
        schema: DeleteBudgetEntryResponse,
        method: "DELETE",
      });
      expect(
        (await get("/budget-entries", BudgetEntryListResponse)).some((e) => e.id === created.id),
      ).toBe(false);
    });

    it("accepts `title` as an alias for the budget entry name", async () => {
      const created = await backendFetch("/budget-entries", {
        accessToken: DEV_TOKEN,
        method: "POST",
        schema: BudgetEntryResponse,
        body: { title: "Legacy title", category: "living", amount: 12, isIncome: false },
      });
      expect(created.name).toBe("Legacy title");
    });

    it("registers the bank-connection refresh route the accounts route calls", async () => {
      const res = await fetch(`${baseUrl}/v1/bank-connections/${crypto.randomUUID()}/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${DEV_TOKEN}` },
      });
      // Registered: the service answers 404 "not found". Unregistered: Nest's "Cannot POST ..." 404.
      expect(res.status).toBe(404);
      expect((await res.json()).message).not.toMatch(/^Cannot POST/);
    });

    it("rejects a budget entry with no name with a 400, not a 500", async () => {
      const res = await fetch(`${baseUrl}/v1/budget-entries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${DEV_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ category: "living", amount: 12 }),
      });
      expect(res.status).toBe(400);
    });
  },
);
