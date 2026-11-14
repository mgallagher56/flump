import "reflect-metadata";
import { DataSource } from "typeorm";
import { cliDataSourceOptions } from "../data-source.options";
import {
  describeLiabilitySignPlan,
  planLiabilitySignBackfill,
} from "../integrity/liability-sign-backfill";

/**
 * BE-05 dry run: prints what migration LiabilitySignRule1794358050000 would re-sign, as counts
 * per table and account type (never ids, names or amounts). Read-only: one READ ONLY transaction,
 * rolled back. Uses the same DATABASE_URL settings as the app.
 *
 *   DATABASE_URL=... bun run --cwd apps/backend liability-signs:dry-run
 */
async function main(): Promise<void> {
  const ds = new DataSource({ ...cliDataSourceOptions(process.env), entities: [], migrations: [] });
  await ds.initialize();
  const runner = ds.createQueryRunner();
  try {
    await runner.startTransaction("REPEATABLE READ");
    await runner.query("SET TRANSACTION READ ONLY");
    // A failed query would abort the read-only transaction, so look before reading.
    const [{ tracked }] = await runner.query(
      `SELECT to_regclass('public.migrations') IS NOT NULL AS "tracked"`,
    );
    const applied: Array<{ n: number }> = tracked
      ? await runner.query(
          `SELECT count(*)::int AS "n" FROM "migrations" WHERE "name" = 'LiabilitySignRule1794358050000'`,
        )
      : [{ n: 0 }];
    const plan = await planLiabilitySignBackfill(runner);
    if ((applied[0]?.n ?? 0) > 0) {
      console.log("LiabilitySignRule1794358050000 is already applied; rows still to change:");
    } else {
      console.log("LiabilitySignRule1794358050000 dry run; rows the migration would re-sign:");
    }
    console.log(describeLiabilitySignPlan(plan));
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await ds.destroy();
  }
}

main().catch((error: unknown) => {
  // The message only: a connection error can carry the URL, and never print secrets.
  const message = error instanceof Error ? error.name : "error";
  console.error(`Dry run failed (${message}). Check DATABASE_URL and network access.`);
  process.exit(1);
});
