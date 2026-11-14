import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations } from "../testing/discoverMigrations";
import {
  explainHotQuery,
  HOT_QUERIES,
  planNodes,
  type SeedScale,
  seedHotQueryData,
  userIdFor,
} from "../testing/hotQueries";

// Plan BE-02 acceptance: EXPLAIN shows index scans for the audit's query shapes (H7). Migrates a
// throwaway schema, seeds enough users that one user's rows are a small slice of each table, and
// checks every hot query reads its table through the planned index instead of a Seq Scan.
// Same skip rules and safety check as migrations.integration.spec.ts.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const SCALE: SeedScale = {
  users: 400,
  accountsPerUser: 5,
  transactionsPerAccount: 10,
  monthsPerAccount: 12,
  taxRecordsPerUser: 10,
  budgetEntriesPerUser: 10,
  connectionsPerUser: 3,
  tokensPerUser: 3,
};

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "hot query plans (real Postgres)",
  () => {
    let ds: DataSource;
    const userId = userIdFor(200);
    let accountId: string;

    beforeAll(async () => {
      assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);
      const options = typeOrmOptionsFromEnv({
        NODE_ENV: "test",
        DATABASE_URL: TEST_DATABASE_URL,
      }) as DataSourceOptions;
      ds = new DataSource({
        ...options,
        migrations: await discoverMigrations(),
        synchronize: false,
        migrationsRun: false,
      });
      await ds.initialize();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
      await seedHotQueryData(ds, SCALE);
      const [row] = await ds.query("SELECT id FROM accounts WHERE user_id = $1 LIMIT 1", [userId]);
      accountId = row.id;
    }, 60_000);

    afterAll(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });

    it.each(HOT_QUERIES.map((q) => [q.name, q] as const))(
      "%s uses its index",
      async (_name, query) => {
        const { plan } = await explainHotQuery(ds, query, userId, accountId);
        const nodes = planNodes(plan);
        const onTable = nodes.filter((n) => n["Relation Name"] === query.table);
        expect(onTable.length, `no plan node reads ${query.table}`).toBeGreaterThan(0);
        expect(onTable.map((n) => n["Node Type"])).not.toContain("Seq Scan");
        // A Bitmap Heap Scan names its index on the Bitmap Index Scan child, not on itself.
        expect(nodes.map((n) => n["Index Name"])).toContain(query.index);
      },
    );
  },
);
