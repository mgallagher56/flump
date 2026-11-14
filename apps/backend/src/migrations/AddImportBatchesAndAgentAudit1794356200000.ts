import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E17 re-plan PR C (import backend) and E17-N17 (agent audit trail). Additive only:
//   1. Create `import_batches` (staged imports, their counts and the prior values for revert).
//   2. Add `account_details.import_batch_id` (nullable, FK to import_batches, SET NULL on delete).
//   3. Allow `account_details.source = 'agent'`.
//   4. Create `agent_audit_events` (one row per MCP tools/call; no amounts, no free text).
// down() reverses every step. Rows already written with source 'agent' are relabelled 'manual'
// first so the old CHECK can be restored (their values are kept).
// Run the E18 backup drill before this reaches staging (re-plan section 9).
const SOURCE_CHECK = "CHK_account_details_source";
const BATCH_FK = "FK_account_details_import_batch";

export class AddImportBatchesAndAgentAudit1794356200000 implements MigrationInterface {
  name = "AddImportBatchesAndAgentAudit1794356200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "import_batches" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "user_id" character varying NOT NULL,
         "status" character varying NOT NULL DEFAULT 'staged',
         "idempotency_key" character varying NOT NULL,
         "payload" jsonb NOT NULL,
         "counts" jsonb NOT NULL,
         "validation_errors" jsonb NOT NULL,
         "revert_data" jsonb,
         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
         "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
         "committed_at" TIMESTAMP,
         "reverted_at" TIMESTAMP,
         "expires_at" TIMESTAMP NOT NULL,
         CONSTRAINT "PK_import_batches" PRIMARY KEY ("id"),
         CONSTRAINT "CHK_import_batches_status"
           CHECK ("status" IN ('staged', 'committed', 'reverted', 'expired'))
       )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_import_batches_user_idempotency_key"
         ON "import_batches" ("user_id", "idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_import_batches_user_status"
         ON "import_batches" ("user_id", "status")`,
    );

    await queryRunner.query(
      `ALTER TABLE "account_details" ADD COLUMN IF NOT EXISTS "import_batch_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${BATCH_FK}"`,
    );
    // NOT VALID then VALIDATE: the add takes a brief lock only, the scan runs under a weaker one.
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${BATCH_FK}"
         FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL
         NOT VALID`,
    );
    await queryRunner.query(`ALTER TABLE "account_details" VALIDATE CONSTRAINT "${BATCH_FK}"`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_account_details_import_batch"
         ON "account_details" ("import_batch_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${SOURCE_CHECK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${SOURCE_CHECK}"
         CHECK ("source" IN ('onboarding', 'manual', 'connected', 'backfill', 'agent')) NOT VALID`,
    );
    await queryRunner.query(`ALTER TABLE "account_details" VALIDATE CONSTRAINT "${SOURCE_CHECK}"`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "agent_audit_events" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "user_id" character varying NOT NULL,
         "token_id" uuid,
         "client_name" character varying(64),
         "tool_name" character varying(64) NOT NULL,
         "scopes_used" text NOT NULL DEFAULT '',
         "outcome" character varying(16) NOT NULL,
         "error_code" character varying(64),
         "latency_ms" integer NOT NULL,
         "response_bytes" integer NOT NULL,
         "args_fingerprint" character varying(64),
         "created_at" TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT "PK_agent_audit_events" PRIMARY KEY ("id"),
         CONSTRAINT "CHK_agent_audit_events_outcome" CHECK ("outcome" IN ('ok', 'error', 'denied'))
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agent_audit_events_user_created"
         ON "agent_audit_events" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agent_audit_events_created"
         ON "agent_audit_events" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_audit_events"`);
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${SOURCE_CHECK}"`,
    );
    await queryRunner.query(
      `UPDATE "account_details" SET "source" = 'manual' WHERE "source" = 'agent'`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" ADD CONSTRAINT "${SOURCE_CHECK}"
         CHECK ("source" IN ('onboarding', 'manual', 'connected', 'backfill'))`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_account_details_import_batch"`);
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP CONSTRAINT IF EXISTS "${BATCH_FK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_details" DROP COLUMN IF EXISTS "import_batch_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "import_batches"`);
  }
}
