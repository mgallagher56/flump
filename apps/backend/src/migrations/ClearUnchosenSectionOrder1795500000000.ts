import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * The home section cards can now be put in any order, saved in `user_profiles.dashboard_widget_order`
 * (owner request, 19 Nov 2026; storage approved by the coordinator). Until now nothing read that
 * column, and onboarding, the Self Assessment page, settings and the profile default wrote orders
 * nobody chose (pages order, accounts first). Honouring them would reorder testers' cards without
 * asking. All stored data is tester data, so the column is cleared once: NULL means the default
 * order, and from now on only the dashboard's "Choose what shows here" writes it.
 *
 * Runs once: after taking the migration lock it re-checks whether another instance has already
 * recorded it (TypeORM's pending list is computed before the transaction), because a second run
 * would wipe orders people have chosen since. Logs counts only, never ids or values.
 */
export const CLEAR_UNCHOSEN_SECTION_ORDER_SQL = `WITH changed AS (
  UPDATE "user_profiles" SET "dashboard_widget_order" = NULL
  WHERE "dashboard_widget_order" IS NOT NULL
  RETURNING 1
)
SELECT count(*)::int AS cleared FROM changed`;

export class ClearUnchosenSectionOrder1795500000000 implements MigrationInterface {
  name = "ClearUnchosenSectionOrder1795500000000";

  private readonly logger = new Logger("ClearUnchosenSectionOrder");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");

    const tableName = queryRunner.connection.options.migrationsTableName ?? "migrations";
    if (await queryRunner.hasTable(tableName)) {
      const escaped = queryRunner.connection.driver.escape(tableName);
      const recorded: unknown[] = await queryRunner.query(
        `SELECT 1 FROM ${escaped} WHERE "name" = $1`,
        [this.name],
      );
      if (recorded.length > 0) {
        this.logger.log("skipped: already ran once");
        return;
      }
    }

    const [{ cleared }] = await queryRunner.query(CLEAR_UNCHOSEN_SECTION_ORDER_SQL);
    this.logger.log(`cleared the saved section order on ${cleared} profiles`);
  }

  /**
   * Deliberately does nothing (accepted by the coordinator). The cleared values were never read
   * and never chosen by a person, so there is nothing true to put back; NULL already reads as the
   * default order, and orders saved since are the person's own and must be kept.
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
