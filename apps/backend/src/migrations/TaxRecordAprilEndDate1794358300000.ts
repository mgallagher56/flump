import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// BE-08 (backend audit 2026-11, finding M1): the UK tax year starts on 6 April, but the old
// record rule (BackfillAnnualTaxRecordEndDate1794355900000 and the tax controller) treated every
// April date as the new year, so an annual record dated 1 to 5 April got the 5 April a year late
// (2026-04-03 ended 2027-04-05, filing it under 2026/27 instead of 2025/26). The controller now
// derives the end date from getUkTaxYearForDate; this corrects the stored rows.
//
// Only annual rows dated 1 to 5 April whose end_date is exactly the late value change. An annual
// record's end_date is always derived by the server (a client value is replaced), so such a row
// can only have been written by the old rule. down() puts the old rule's value back on every
// annual 1-5 April row (including ones written after deploy, matching the code it reverts to).
// Counts are logged, never ids or amounts. One UPDATE on a small table, taking row locks only;
// lock_timeout makes it fail fast rather than queue behind a long transaction.
const APRIL_1_TO_5 = `EXTRACT(MONTH FROM "date") = 4 AND EXTRACT(DAY FROM "date") <= 5`;

export class TaxRecordAprilEndDate1794358300000 implements MigrationInterface {
  name = "TaxRecordAprilEndDate1794358300000";

  private readonly logger = new Logger("TaxRecordAprilEndDate");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    const [{ n }]: Array<{ n: number }> = await queryRunner.query(
      `WITH changed AS (
         UPDATE "tax_records"
         SET "end_date" = make_date(EXTRACT(YEAR FROM "date")::int, 4, 5)
         WHERE "frequency" = 'annual' AND ${APRIL_1_TO_5}
           AND "end_date" = make_date(EXTRACT(YEAR FROM "date")::int + 1, 4, 5)
         RETURNING 1
       )
       SELECT count(*)::int AS "n" FROM changed`,
    );
    this.logger.log(`Annual tax records dated 1-5 April moved to the right tax year: ${n}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `UPDATE "tax_records"
       SET "end_date" = make_date(EXTRACT(YEAR FROM "date")::int + 1, 4, 5)
       WHERE "frequency" = 'annual' AND ${APRIL_1_TO_5}
         AND "end_date" = make_date(EXTRACT(YEAR FROM "date")::int, 4, 5)`,
    );
  }
}
