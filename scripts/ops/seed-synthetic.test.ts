import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Client } from "pg";
import { discoverMigrations } from "../../apps/backend/src/testing/discoverMigrations";
import { DB_TESTS_ENABLED, resetSchema, runInTransaction, withClient } from "./db-test-support";
import {
  parseArgs,
  type SeedClient,
  seedSynthetic,
  USER_DATA_TABLES,
  validateAssignment,
} from "./seed-synthetic";
import { SYNTHETIC_PERSONAS } from "./synthetic-personas";

const P1_ID = "user_SYNTHETICP1TEST01";
const P2_ID = "user_SYNTHETICP2TEST02";
const P3_ID = "user_SYNTHETICP3TEST03";
const P5_ID = "user_SYNTHETICP5TEST05";
const REAL_LOOKING = "user_01REALPERSONNOTSYNTH";

describe("argument and persona validation (no database)", () => {
  test("parseArgs reads --persona KEY=id pairs and rejects anything else", () => {
    expect(parseArgs(["--persona", `P1=${P1_ID}`, "--persona", `P2=${P2_ID}`])).toEqual({
      P1: P1_ID,
      P2: P2_ID,
    });
    expect(() => parseArgs(["--persona", "P1"])).toThrow("P1=<WorkOS user id>");
    expect(() => parseArgs(["--persona", `P1=${P1_ID}`, "--persona", `P1=${P2_ID}`])).toThrow(
      "twice",
    );
    expect(() => parseArgs(["--force"])).toThrow("Unknown argument");
  });

  test("validateAssignment rejects none, unknown keys, placeholders and shared ids", () => {
    expect(() => validateAssignment({})).toThrow("at least one");
    expect(() => validateAssignment({ P4: P1_ID } as never)).toThrow("Unknown persona");
    expect(() => validateAssignment({ P1: "<WorkOS user id>" })).toThrow("WorkOS user id");
    expect(() => validateAssignment({ P1: "user_xx'; DROP TABLE accounts;--" })).toThrow();
    expect(() => validateAssignment({ P1: P1_ID, P2: P1_ID })).toThrow("own WorkOS user id");
  });

  test("every persona is clearly synthetic", () => {
    for (const persona of Object.values(SYNTHETIC_PERSONAS)) {
      expect(persona.profile.displayName).toStartWith("Synthetic");
      for (const account of persona.accounts) expect(account.name).toStartWith("Synthetic");
    }
  });

  test("refuses when the database comment query reports anything but flump-staging", async () => {
    const calls: string[] = [];
    const fake: SeedClient = {
      query: async (sql: string) => {
        calls.push(sql.split(/\s+/)[0] ?? "");
        return { rows: [{ comment: "" }] };
      },
    };
    await expect(seedSynthetic(fake, { P1: P1_ID })).rejects.toThrow("flump-staging");
    expect(calls).toEqual(["BEGIN", "SELECT", "ROLLBACK"]); // nothing deleted or inserted
  });
});

describe.skipIf(!DB_TESTS_ENABLED)("seed-synthetic (real Postgres, all migrations)", () => {
  let originalComment = "";
  let databaseName = "";

  const setComment = (client: Client, comment: string | null) =>
    client.query(
      `COMMENT ON DATABASE "${databaseName.replaceAll('"', '""')}" IS ${
        comment === null ? "NULL" : `'${comment.replaceAll("'", "''")}'`
      }`,
    );

  const count = async (client: Client, table: string) =>
    Number((await client.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n);

  const snapshot = async (client: Client) => {
    const out: Record<string, unknown[]> = {};
    for (const table of USER_DATA_TABLES) {
      // Drop generated ids and timestamps: they differ between runs by design.
      const { rows } = await client.query(`SELECT * FROM "${table}"`);
      out[table] = rows
        .map((row) => {
          const { id, created_at, updated_at, account_id, ...rest } = row;
          return JSON.stringify(rest);
        })
        .sort();
    }
    return out;
  };

  // The schema is rebuilt with EVERY migration (the same discovery the backend migration suite
  // uses), so a column rename or a new NOT NULL column makes this fail in CI.
  beforeAll(async () => {
    await withClient(async (client) => {
      databaseName = (await client.query("SELECT current_database() AS d")).rows[0].d;
      originalComment =
        (
          await client.query(
            "SELECT coalesce(shobj_description(oid, 'pg_database'), '') AS c FROM pg_database WHERE datname = current_database()",
          )
        ).rows[0].c ?? "";
      await resetSchema(client);
      for (const Migration of await discoverMigrations()) {
        await runInTransaction(client, new (Migration as new () => never)());
      }
      // What TypeORM keeps: the seed must never delete from it.
      await client.query(
        "CREATE TABLE migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)",
      );
      await client.query("INSERT INTO migrations (timestamp, name) VALUES (1, 'Synthetic')");
      // Stale user data from "restored production" and a non-persona user.
      await client.query(
        `INSERT INTO accounts (user_id, name, type, balance, currency)
         VALUES ('${REAL_LOOKING}', 'old account', 'Saving', 1, 'GBP')`,
      );
      await client.query(
        `INSERT INTO budget_entries (user_id, category, name, amount)
         VALUES ('${REAL_LOOKING}', 'bills', 'old', 1)`,
      );
      await client.query(
        `INSERT INTO user_profiles (user_id, display_name) VALUES ('${REAL_LOOKING}', 'old')`,
      );
      await client.query(
        `INSERT INTO transactions (account_id, user_id, amount, description, category)
         VALUES ('x', '${REAL_LOOKING}', 1, 'old', 'old')`,
      );
    });
  });

  afterAll(async () => {
    if (!DB_TESTS_ENABLED) return;
    await withClient(async (client) => {
      await setComment(client, originalComment === "" ? null : originalComment);
    });
  });

  test("refuses without the marker and leaves every row alone", async () => {
    await withClient(async (client) => {
      await setComment(client, null);
      const before = await snapshot(client);
      await expect(seedSynthetic(client as never, { P1: P1_ID })).rejects.toThrow("flump-staging");
      await setComment(client, "flump-production");
      await expect(seedSynthetic(client as never, { P1: P1_ID })).rejects.toThrow("flump-staging");
      expect(await snapshot(client)).toEqual(before);
      expect(await count(client, "accounts")).toBe(1);
    });
  });

  test("replaces all user data with the personas, idempotently, for persona ids only", async () => {
    await withClient(async (client) => {
      await setComment(client, "flump-staging");
      const assignment = { P1: P1_ID, P2: P2_ID, P3: P3_ID, P5: P5_ID };

      const first = await seedSynthetic(client as never, assignment);
      const afterFirst = await snapshot(client);
      const second = await seedSynthetic(client as never, assignment);
      const afterSecond = await snapshot(client);

      expect(second).toEqual(first);
      expect(afterSecond).toEqual(afterFirst);

      const expectedAccounts = Object.values(SYNTHETIC_PERSONAS).reduce(
        (n, p) => n + p.accounts.length,
        0,
      );
      expect(first.accounts).toBe(expectedAccounts);
      expect(first.user_profiles).toBe(4);
      expect(first.transactions).toBe(0);
      expect(first.bank_connections).toBe(0);
      expect(first.mcp_tokens).toBe(0);

      const ids = [P1_ID, P2_ID, P3_ID, P5_ID];
      for (const table of USER_DATA_TABLES) {
        if (table === "account_details") continue; // keyed by account id, checked below
        const { rows } = await client.query(
          `SELECT count(*)::int AS n FROM "${table}" WHERE NOT (user_id = ANY($1::text[]))`,
          [ids],
        );
        expect(Number(rows[0].n)).toBe(0);
      }
      const orphans = await client.query(
        `SELECT count(*)::int AS n FROM account_details d
         WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id::text = d.account_id)`,
      );
      expect(Number(orphans.rows[0].n)).toBe(0);

      // Current columns survive a round trip.
      const mortgage = await client.query(
        "SELECT term_months, to_char(fixed_rate_end_date, 'YYYY-MM-DD') AS d FROM accounts WHERE user_id = $1 AND type = 'Mortgage'",
        [P2_ID],
      );
      expect(mortgage.rows[0]).toEqual({ term_months: 240, d: "2028-03-31" });
      // migrations table is untouched.
      expect(await count(client, "migrations")).toBeGreaterThan(0);
    });
  });

  test("seeding a subset removes the personas that are no longer chosen", async () => {
    await withClient(async (client) => {
      await setComment(client, "flump-staging");
      await seedSynthetic(client as never, { P1: P1_ID });
      const { rows } = await client.query("SELECT DISTINCT user_id FROM user_profiles");
      expect(rows).toEqual([{ user_id: P1_ID }]);
      expect(await count(client, "tax_records")).toBe(0);
    });
  });
});
