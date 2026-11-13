import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// E23 D16 / DECISIONS D-7-A: an annual tax record belongs to the tax year containing its `date`
// and stores that in `end_date`. This sets `end_date` to 5 April closing the tax year the engine's
// RECORD rule files `date` under (getTaxYearForRecordDate / getAnnualRecordEndDate in
// packages/finance-engine): month April or later ends 5 April of the following year, January to
// March ends 5 April of the same year (so 1-5 April belong to the year that starts that April).
// Only rows with frequency 'annual' and a NULL end_date are touched, so it is idempotent and a
// no-op on an empty table. Accepted without a backup: the owner has confirmed production data is
// test data (DECISIONS, E23 backup round).
export class BackfillAnnualTaxRecordEndDate1794355900000 implements MigrationInterface {
  name = "BackfillAnnualTaxRecordEndDate1794355900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `UPDATE "tax_records"
       SET "end_date" = make_date(
         (CASE WHEN EXTRACT(MONTH FROM "date") >= 4
               THEN EXTRACT(YEAR FROM "date")::int
               ELSE EXTRACT(YEAR FROM "date")::int - 1 END) + 1,
         4,
         5
       )
       WHERE "frequency" = 'annual' AND "end_date" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    // Intentionally a no-op: backfilled end dates cannot be told apart from end dates a user set,
    // and an annual record with an end_date counts once either way, so leaving them is harmless.
  }
}
