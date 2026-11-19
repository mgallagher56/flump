import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Owner item 28 lets a savings row be marked essential, so Breathing room counts it, and asks for
 * the mark to be off by default. Until now the flag on a savings row meant nothing: the column
 * defaults to true, the old editor's add row set it on every row but expenses, and the old seed
 * marked "Emergency Fund" and "ISA / Investments" essential. Nobody chose it. All stored data is
 * tester data, so this puts it in a consistent state: the flag is cleared on every spending row in
 * the savings category, the same test the engine uses (category exactly "savings", income rows
 * skipped: `SAVINGS_CATEGORY` in finance-engine budget-totals.ts).
 *
 * Idempotent: a second run finds no savings row still marked and changes nothing.
 */
export const SAVINGS_ROWS_NOT_ESSENTIAL_SQL = `UPDATE "budget_entries" SET "is_essential" = false WHERE "category" = 'savings' AND "is_income" = false AND "is_essential" = true`;

export class SavingsRowsNotEssential1795450000000 implements MigrationInterface {
  name = "SavingsRowsNotEssential1795450000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(SAVINGS_ROWS_NOT_ESSENTIAL_SQL);
  }

  /**
   * Deliberately does nothing. The values cleared by `up` were meaningless (set by a column
   * default, an old add row and an old seed, never by a person), so there is nothing true to put
   * back, and setting them all to true again would raise Breathing room's essentials for rows
   * nobody marked.
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
