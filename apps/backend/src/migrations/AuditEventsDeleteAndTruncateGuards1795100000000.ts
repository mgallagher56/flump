import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// SEC-F (finding S10). The BE-06 trigger on `audit_events` refuses UPDATE only, so a bug could
// still empty the table. This adds two more triggers, and changes no row:
//   1. BEFORE TRUNCATE: always refused.
//   2. BEFORE DELETE (per row): refused unless the transaction has set `flump.audit_delete` to
//      'retention' (the daily purge, jobs/retention.ts) or 'erasure' (the account-deletion sweep).
//      See audit/audit-delete-guard.ts; the setting name and the two reasons are repeated here
//      because a migration must keep meaning what it meant when it ran.
// Live-safe: CREATE TRIGGER takes a brief SHARE ROW EXCLUSIVE lock on a small table, under a lock
// timeout so it fails fast rather than queueing. Deploy order does not matter for writes (INSERT
// is untouched); the app code that sets the reason ships in the same release, and the retention
// cron runs from the same image.
// This guards against bugs in the app, not a stolen database credential (a separate restricted
// role is the owner step in OWNER-SETUP.md, SEC-F).
// down() drops the two triggers and their functions. It never deletes or rewrites an audit row, so
// there is nothing to refuse.
export class AuditEventsDeleteAndTruncateGuards1795100000000 implements MigrationInterface {
  name = "AuditEventsDeleteAndTruncateGuards1795100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");

    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION "audit_events_refuse_truncate"() RETURNS trigger
         LANGUAGE plpgsql AS $$
       BEGIN
         RAISE EXCEPTION 'audit_events cannot be truncated' USING ERRCODE = 'check_violation';
       END;
       $$`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_audit_events_no_truncate" ON "audit_events"`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_audit_events_no_truncate" BEFORE TRUNCATE ON "audit_events"
         FOR EACH STATEMENT EXECUTE FUNCTION "audit_events_refuse_truncate"()`,
    );

    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION "audit_events_guard_delete"() RETURNS trigger
         LANGUAGE plpgsql AS $$
       BEGIN
         IF current_setting('flump.audit_delete', true) IN ('retention', 'erasure') THEN
           RETURN OLD;
         END IF;
         RAISE EXCEPTION 'audit_events rows are deleted only by retention or erasure'
           USING ERRCODE = 'check_violation';
       END;
       $$`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_audit_events_guard_delete" ON "audit_events"`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "TRG_audit_events_guard_delete" BEFORE DELETE ON "audit_events"
         FOR EACH ROW EXECUTE FUNCTION "audit_events_guard_delete"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_audit_events_guard_delete" ON "audit_events"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_audit_events_no_truncate" ON "audit_events"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS "audit_events_guard_delete"()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "audit_events_refuse_truncate"()`);
  }
}
