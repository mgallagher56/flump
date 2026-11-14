import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// BE-06 (findings H12, M-PRIV3, ruling D4). Additive only:
//   1. `audit_events`: append-only record of sensitive actions (token mint and revoke, bank connect
//      and disconnect, account delete, reset, user deletion). A trigger refuses every UPDATE, so a
//      row can be removed (retention, erasure) but never rewritten. This guards against bugs in
//      the app, not a stolen database credential: the app role can still DELETE, TRUNCATE or drop
//      the trigger (a separate restricted role is a follow-up, OWNER-SETUP.md BE-06).
//   2. `consents`: AI access, bank access and (reserved) terms acceptance, with withdrawal time.
//   3. `user_profiles.last_active_at` (NOT NULL, default now(); existing rows start at the
//      migration time, so nobody becomes due for inactive-account erasure early) and its index.
// No existing data is read or changed beyond the new column's default. Live-safe: two new tables,
// and on `user_profiles` a column with a constant default (metadata only on Postgres 11+) plus an
// index on a small table, under a lock timeout so it fails fast rather than queueing.
// down() drops the trigger, both tables and the column: the audit trail and consent records are
// lost, no user financial data is.
export class AuditEventsAndConsents1794700000000 implements MigrationInterface {
  name = "AuditEventsAndConsents1794700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "audit_events" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "user_id" character varying,
         "action" character varying(64) NOT NULL,
         "actor_type" character varying(16) NOT NULL DEFAULT 'user',
         "target_id" uuid,
         "request_id" character varying(128),
         "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "PK_audit_events" PRIMARY KEY ("id"),
         CONSTRAINT "CHK_audit_events_action" CHECK ("action" IN ('mcp_token.minted', 'mcp_token.revoked', 'bank_connection.connected', 'bank_connection.disconnected', 'account.deleted', 'financial_data.reset', 'user.deleted')),
         CONSTRAINT "CHK_audit_events_actor_type" CHECK ("actor_type" IN ('user', 'system'))
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_events_user_created"
         ON "audit_events" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_events_created" ON "audit_events" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION "audit_events_append_only"() RETURNS trigger
         LANGUAGE plpgsql AS $$
       BEGIN
         RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = 'check_violation';
       END;
       $$`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_audit_events_append_only" ON "audit_events"`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_audit_events_append_only" BEFORE UPDATE ON "audit_events"
         FOR EACH ROW EXECUTE FUNCTION "audit_events_append_only"()`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "consents" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "user_id" character varying NOT NULL,
         "kind" character varying(32) NOT NULL,
         "version" character varying(128) NOT NULL,
         "target_id" uuid,
         "granted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "withdrawn_at" TIMESTAMP WITH TIME ZONE,
         CONSTRAINT "PK_consents" PRIMARY KEY ("id"),
         CONSTRAINT "CHK_consents_kind" CHECK ("kind" IN ('terms', 'ai_access', 'bank_access'))
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_consents_user_kind" ON "consents" ("user_id", "kind")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_consents_target" ON "consents" ("target_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_profiles"
         ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_profiles_last_active_at"
         ON "user_profiles" ("last_active_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_profiles_last_active_at"`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "last_active_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_events"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "audit_events_append_only"()`);
  }
}
