import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// BE-15 (finding N3): a data export writes one audit row with the new action 'user.exported'. Only
// the CHECK changes. The new CHECK is added NOT VALID then validated, as in
// AddLivingWithFamilyHousingStatus1794700000000. The three statements (drop, add, validate) run in
// one transaction, so the table lock taken by the first is held through validation. That is
// acceptable because audit_events is small; on a large table the validation would belong in a
// separate migration.
const CONSTRAINT = "CHK_audit_events_action";
const BEFORE = [
  "mcp_token.minted",
  "mcp_token.revoked",
  "bank_connection.connected",
  "bank_connection.disconnected",
  "account.deleted",
  "financial_data.reset",
  "user.deleted",
];
const AFTER = [...BEFORE, "user.exported"];
const inList = (actions: string[]) => `"action" IN (${actions.map((a) => `'${a}'`).join(", ")})`;

const USER_EXPORTED_DOWN_REFUSAL =
  "audit_events contains user.exported rows; export or archive them before reverting";

async function replaceCheck(queryRunner: QueryRunner, expr: string): Promise<void> {
  await queryRunner.query(`ALTER TABLE "audit_events" DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"`);
  await queryRunner.query(
    `ALTER TABLE "audit_events" ADD CONSTRAINT "${CONSTRAINT}" CHECK (${expr}) NOT VALID`,
  );
  await queryRunner.query(`ALTER TABLE "audit_events" VALIDATE CONSTRAINT "${CONSTRAINT}"`);
}

export class AuditActionUserExported1795000000000 implements MigrationInterface {
  name = "AuditActionUserExported1795000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await replaceCheck(queryRunner, inList(AFTER));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // The audit trail is append-only: reverting never deletes or rewrites a row. While any
    // 'user.exported' row exists the older CHECK cannot hold, so the revert is refused unchanged.
    const rows: Array<{ found: boolean }> = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM "audit_events" WHERE "action" = 'user.exported') AS "found"`,
    );
    if (rows[0]?.found) {
      throw new Error(USER_EXPORTED_DOWN_REFUSAL);
    }
    await replaceCheck(queryRunner, inList(BEFORE));
  }
}
