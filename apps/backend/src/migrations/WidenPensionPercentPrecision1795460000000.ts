import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * The profile stores a workplace pension rate as a percentage of salary, and pounds a month are
 * worked out from it (finance-engine `contributionMonthlyFromPercent`). At two decimal places a
 * typed £100 a month on a £37,260 salary was saved as 3.22% and shown back as £99.98 (37,260 × 3.22% ÷ 12 = £99.981). Four decimal
 * places keep pounds to the penny for ordinary salaries: 100 × 12 / 37,260 = 3.2206%, and
 * 37,260 × 3.2206% / 12 = £99.9996, shown as £100.00. The percentage stays the one stored value.
 *
 * numeric(7,4) still holds 100.0000, the most a rate can be. user_profiles is small (one row per
 * person), so the brief rewrite under the migration lock is fine. Idempotent: a second run sets
 * the type each column already has.
 */
export const PENSION_PERCENT_COLUMNS = ["pension_percent", "pension_employer_percent"] as const;

const widenSql = (column: string): string =>
  `ALTER TABLE "user_profiles" ALTER COLUMN "${column}" TYPE numeric(7,4)`;

const narrowSql = (column: string): string =>
  `ALTER TABLE "user_profiles" ALTER COLUMN "${column}" TYPE numeric(5,2) USING round("${column}", 2)`;

export class WidenPensionPercentPrecision1795460000000 implements MigrationInterface {
  name = "WidenPensionPercentPrecision1795460000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    for (const column of PENSION_PERCENT_COLUMNS) await queryRunner.query(widenSql(column));
  }

  /** Rounds each rate back to two decimal places, as the column held it before. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    for (const column of PENSION_PERCENT_COLUMNS) await queryRunner.query(narrowSql(column));
  }
}
