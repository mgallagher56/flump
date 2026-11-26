import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// E12 S2b: the mobile app's sign-out writes one audit row with the new action
// 'session.signed_out' (no session id, no metadata). Only the CHECK changes, the same way as
// AuditActionUserExported1795000000000: drop, add NOT VALID, validate, in one transaction, which is
// acceptable because audit_events is small.
const CONSTRAINT = "CHK_audit_events_action";
const BEFORE = [
  "mcp_token.minted",
  "mcp_token.revoked",
  "bank_connection.connected",
  "bank_connection.disconnected",
  "account.deleted",
  "financial_data.reset",
  "user.deleted",
  "user.exported",
];
const AFTER = [...BEFORE, "session.signed_out"];
const inList = (actions: string[]) => `"action" IN (${actions.map((a) => `'${a}'`).join(", ")})`;

const DOWN_REFUSAL =
  "audit_events contains session.signed_out rows; export or archive them before reverting";

async function replaceCheck(queryRunner: QueryRunner, expr: string): Promise<void> {
  await queryRunner.query(`ALTER TABLE "audit_events" DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"`);
  await queryRunner.query(
    `ALTER TABLE "audit_events" ADD CONSTRAINT "${CONSTRAINT}" CHECK (${expr}) NOT VALID`,
  );
  await queryRunner.query(`ALTER TABLE "audit_events" VALIDATE CONSTRAINT "${CONSTRAINT}"`);
}

export class AuditActionSessionSignedOut1795750000000 implements MigrationInterface {
  name = "AuditActionSessionSignedOut1795750000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await replaceCheck(queryRunner, inList(AFTER));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // The audit trail is append-only: reverting never deletes or rewrites a row. While any
    // 'session.signed_out' row exists the older CHECK cannot hold, so the revert is refused unchanged.
    const rows: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM "audit_events" WHERE "action" = 'session.signed_out') AS "found"`,
    );
    if (rows[0]?.found) {
      throw new Error(DOWN_REFUSAL);
    }
    await replaceCheck(queryRunner, inList(BEFORE));
  }
}
