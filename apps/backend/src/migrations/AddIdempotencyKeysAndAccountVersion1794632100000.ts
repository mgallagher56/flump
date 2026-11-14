import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// BE-09 (backend audit 2026-11, findings M7 and L15). Additive and reversible:
//   1. `idempotency_keys` stores the first response of a create POST sent with an
//      `Idempotency-Key` header, so a retry replays it instead of creating a second row. Unique per
//      (user, route, key); `created_at` is indexed for the 24-hour expiry and later clean-up (BE-06).
//      `user_id` has no foreign key: there is no users table (identities live with the provider),
//      so a reset deletes the rows by user_id and account deletion (BE-04) must too.
//   2. `accounts.updated_at` is the resource version behind the ETag / If-Match precondition. It
//      defaults to now(), so existing rows get a version without a backfill; a metadata-only
//      change on Postgres 11+ (non-volatile default), so it takes the table lock only briefly.
// down() drops both. Neither holds data another feature relies on.
export class AddIdempotencyKeysAndAccountVersion1794632100000 implements MigrationInterface {
  name = "AddIdempotencyKeysAndAccountVersion1794632100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "idempotency_keys" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "user_id" character varying NOT NULL,
         "route_id" character varying(64) NOT NULL,
         "key" character varying(255) NOT NULL,
         "request_hash" character(64) NOT NULL,
         "status_code" smallint,
         "response_body" jsonb,
         "response_headers" jsonb,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "PK_idempotency_keys_id" PRIMARY KEY ("id"),
         CONSTRAINT "UQ_idempotency_keys_user_route_key" UNIQUE ("user_id", "route_id", "key")
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_idempotency_keys_created" ON "idempotency_keys" ("created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN IF EXISTS "updated_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);
  }
}
