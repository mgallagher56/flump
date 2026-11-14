import "reflect-metadata";
import { DataSource } from "typeorm";
import { cliDataSourceOptions } from "../data-source.options";
import { describeRetentionReport, runRetentionPurge } from "./retention";

/**
 * BE-06 retention purge (rulings D4, D5). Started once a day by the Railway cron service configured
 * in apps/backend/retention.railway.json (the owner provisions it: OWNER-SETUP.md, BE-06), and
 * exits. Uses the same DATABASE_URL settings as the app; never runs migrations.
 *
 *   DATABASE_URL=... bun run --cwd apps/backend retention:purge
 *
 * Optional RETENTION_HEARTBEAT_URL is fetched after a successful run (dead-man switch).
 */
async function main(): Promise<void> {
  const ds = new DataSource({ ...cliDataSourceOptions(process.env), entities: [], migrations: [] });
  await ds.initialize();
  const runner = ds.createQueryRunner();
  try {
    await runner.connect();
    const report = await runRetentionPurge(runner);
    for (const line of describeRetentionReport(report)) console.log(line);
  } finally {
    await runner.release();
    await ds.destroy();
  }
  const heartbeat = process.env.RETENTION_HEARTBEAT_URL?.trim();
  if (heartbeat?.startsWith("https://")) {
    await fetch(heartbeat, { signal: AbortSignal.timeout(10_000) }).catch(() => {
      console.error("retention heartbeat failed");
    });
  }
}

main().catch((error: unknown) => {
  // The error name only: a connection error can carry the URL, and secrets are never printed.
  const name = error instanceof Error ? error.name : "error";
  console.error(`retention purge failed (${name}). Check DATABASE_URL and network access.`);
  process.exit(1);
});
