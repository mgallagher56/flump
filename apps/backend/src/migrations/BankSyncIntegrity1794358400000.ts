import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// BE-12 bank sync integrity (audit H4, M4). Additive, and safe on a live database: bank
// connections have never been switched on in production (D11), so the tables are tiny.
//
// 1. Duplicate synced accounts (same user, connection and external account id) are removed,
//    keeping the oldest row of each group, with their history and transactions; then the partial
//    unique index the sync upserts on is created. Removed duplicates are not recoverable from
//    `down`, which only drops the index.
//    Before that, duplicate connections to one bank for one user are removed (keeping the most
//    recently updated) and `UQ_bank_connections_user_institution` makes connect idempotent.
// 2. `bank_connections.sync_started_at`: the per-connection sync lease (a second sync gets 409).
// 3. `bank_oauth_states`: random, single-use, hashed OAuth state with the PKCE verifier.
const INDEX = "UQ_accounts_user_connection_external";
const CONNECTION_INDEX = "UQ_bank_connections_user_institution";
// Duplicate connections to the same bank for one user (a double-clicked connect): keep the most
// recently updated, drop the others with everything synced from them.
const DUPLICATE_CONNECTIONS = `
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "user_id", "institution_id" ORDER BY "updated_at" DESC, "id"
    ) AS rn
    FROM "bank_connections"
  ) ranked WHERE rn > 1`;
const DUPLICATE_CONNECTION_ACCOUNTS = `
  SELECT "id"::text FROM "accounts" WHERE "connection_id" IN (${DUPLICATE_CONNECTIONS})`;
const DUPLICATES = `
  SELECT "id"::text FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "user_id", "connection_id", "external_account_id"
      ORDER BY "created_at", "id"
    ) AS rn
    FROM "accounts"
    WHERE "connection_id" IS NOT NULL AND "external_account_id" IS NOT NULL
  ) ranked WHERE rn > 1`;

export class BankSyncIntegrity1794358400000 implements MigrationInterface {
  name = "BankSyncIntegrity1794358400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);

    for (const table of ["account_details", "transactions"]) {
      await queryRunner.query(
        `DELETE FROM "${table}" WHERE "account_id"::text IN (${DUPLICATE_CONNECTION_ACCOUNTS})`,
      );
    }
    await queryRunner.query(
      `DELETE FROM "accounts" WHERE "connection_id" IN (${DUPLICATE_CONNECTIONS})`,
    );
    await queryRunner.query(
      `DELETE FROM "bank_connections" WHERE "id" IN (${DUPLICATE_CONNECTIONS})`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${CONNECTION_INDEX}"
       ON "bank_connections" ("user_id", "institution_id")`,
    );

    await queryRunner.query(
      `DELETE FROM "account_details" WHERE "account_id"::text IN (${DUPLICATES})`,
    );
    await queryRunner.query(
      `DELETE FROM "transactions" WHERE "account_id"::text IN (${DUPLICATES})`,
    );
    await queryRunner.query(`DELETE FROM "accounts" WHERE "id"::text IN (${DUPLICATES})`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${INDEX}"
       ON "accounts" ("user_id", "connection_id", "external_account_id")
       WHERE "connection_id" IS NOT NULL AND "external_account_id" IS NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "sync_started_at" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "bank_oauth_states" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "user_id" character varying NOT NULL,
         "institution_id" character varying NOT NULL,
         "state_hash" character(64) NOT NULL,
         "code_verifier" text NOT NULL,
         "redirect_uri" text NOT NULL,
         "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "PK_bank_oauth_states" PRIMARY KEY ("id")
       )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bank_oauth_states_state_hash" ON "bank_oauth_states" ("state_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bank_oauth_states_user_id" ON "bank_oauth_states" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_oauth_states"`);
    await queryRunner.query(
      `ALTER TABLE "bank_connections" DROP COLUMN IF EXISTS "sync_started_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "${INDEX}"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "${CONNECTION_INDEX}"`);
  }
}
