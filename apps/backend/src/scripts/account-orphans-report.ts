import "reflect-metadata";
import { DataSource } from "typeorm";
import { cliDataSourceOptions } from "../data-source.options";
import {
  countAccountOrphans,
  describeAccountOrphans,
  totalOrphans,
} from "../integrity/account-orphans";

/**
 * BE-08 report: prints the account_details and transactions rows that migration
 * AccountIdForeignKeys1794358200000 deletes before adding its foreign keys, as counts per table
 * (never ids, names or amounts). Read-only: one READ ONLY transaction, rolled back. Uses the same
 * DATABASE_URL settings as the app.
 *
 *   DATABASE_URL=... bun run --cwd apps/backend account-orphans:report
 */
async function main(): Promise<void> {
  const ds = new DataSource({ ...cliDataSourceOptions(process.env), entities: [], migrations: [] });
  await ds.initialize();
  const runner = ds.createQueryRunner();
  try {
    await runner.startTransaction("REPEATABLE READ");
    await runner.query("SET TRANSACTION READ ONLY");
    const counts = await countAccountOrphans(runner);
    console.log(
      `Account orphans (rows naming no account of their own user): ${totalOrphans(counts)}`,
    );
    console.log(describeAccountOrphans(counts));
  } finally {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
    await ds.destroy();
  }
}

main().catch((error: unknown) => {
  // The message only: a connection error can carry the URL, and never print secrets.
  const message = error instanceof Error ? error.name : "error";
  console.error(`Orphan report failed (${message}). Check DATABASE_URL and network access.`);
  process.exit(1);
});
