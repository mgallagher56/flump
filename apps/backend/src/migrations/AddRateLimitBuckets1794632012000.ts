import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// BE-07 (M10). Additive only: creates `rate_limit_buckets`, the shared fixed-window counters
// (decision D6: Postgres, no Redis) for the credential, token-mint, destructive and other low-volume
// per-user buckets, and the MCP limiters. One row per bucket key and window length; rows are
// disposable and expire with their window. No entity maps it (security/pg-rate-limit.store.ts uses
// raw SQL), so it is listed with the other migration-only tables in migrations.integration.spec.ts.
// No foreign keys: the key is an opaque string, never a reference to another table.
// down() drops the table. Rolling back only resets the counters, as a deploy used to.
export class AddRateLimitBuckets1794632012000 implements MigrationInterface {
  name = "AddRateLimitBuckets1794632012000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
         "key" text NOT NULL,
         "window_start" TIMESTAMP WITH TIME ZONE NOT NULL,
         "count" integer NOT NULL,
         "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
         CONSTRAINT "PK_rate_limit_buckets" PRIMARY KEY ("key"),
         CONSTRAINT "CHK_rate_limit_buckets_count" CHECK ("count" >= 0)
       )`,
    );
    // The expiry sweep (DELETE ... WHERE expires_at < now()) reads this index, not the table.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rate_limit_buckets_expires_at"
         ON "rate_limit_buckets" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`DROP TABLE IF EXISTS "rate_limit_buckets"`);
  }
}
