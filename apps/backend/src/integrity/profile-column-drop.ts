import { Logger } from "@nestjs/common";
import type { QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * System audit slice 9 (owner decision 12): drops the retired profile columns, one migration
 * each, a release after their last readers went (PR 808, released in PR 804).
 *
 * Before a column goes, every value that differs from the column's default is copied to
 * `profile_column_drop_backfill` (kept 30 days by the retention job; rows go with the profile by
 * ON DELETE CASCADE, and a financial data reset clears them). A value equal to the default is not
 * copied: down() re-adds the column with its default, which gives that value back. down() then
 * restores the copied values and removes its rows; the last drop's down() removes the table.
 *
 * Idempotent: up() on a database where the column is already gone (built by synchronize, or
 * re-run) copies nothing and drops nothing; down() where the column is present re-adds nothing.
 * Logs give counts only. Column names and DDL are constants below, never user input.
 */
export const PROFILE_COLUMN_DROP_TABLE = "profile_column_drop_backfill";

export interface DroppedProfileColumn {
  /** The migration class (and TypeORM name) that drops it. */
  migration: string;
  column: string;
  /** Postgres type, as the baseline created it. */
  type: string;
  /** Default as an SQL literal, or null for a nullable column with no default. */
  defaultSql: string | null;
}

/** The twelve columns, in migration order. Definitions are from Baseline1794355200000. */
export const DROPPED_PROFILE_COLUMNS: readonly DroppedProfileColumn[] = [
  {
    migration: "DropProfileHasBuyToLet1795540000000",
    column: "has_buy_to_let",
    type: "boolean",
    defaultSql: "false",
  },
  {
    migration: "DropProfileBuyToLetCount1795540100000",
    column: "buy_to_let_count",
    type: "integer",
    defaultSql: "1",
  },
  {
    migration: "DropProfileBuyToLetPropertyValue1795540200000",
    column: "buy_to_let_property_value",
    type: "numeric(12,2)",
    defaultSql: null,
  },
  {
    migration: "DropProfileBuyToLetMonthlyRental1795540300000",
    column: "buy_to_let_monthly_rental",
    type: "numeric(12,2)",
    defaultSql: null,
  },
  {
    migration: "DropProfileBuyToLetMortgageBalance1795540400000",
    column: "buy_to_let_mortgage_balance",
    type: "numeric(12,2)",
    defaultSql: null,
  },
  {
    migration: "DropProfileBuyToLetMortgageRate1795540500000",
    column: "buy_to_let_mortgage_rate",
    type: "numeric(5,2)",
    defaultSql: null,
  },
  {
    migration: "DropProfileBuyToLetMortgageType1795540600000",
    column: "buy_to_let_mortgage_type",
    type: "character varying",
    defaultSql: "'interest-only'",
  },
  {
    migration: "DropProfileMonthlySavingsTarget1795540700000",
    column: "monthly_savings_target",
    type: "numeric(12,2)",
    defaultSql: null,
  },
  {
    migration: "DropProfileSavingsAllocationMode1795540800000",
    column: "savings_allocation_mode",
    type: "character varying",
    defaultSql: "'per_account'",
  },
  {
    migration: "DropProfileSavingsDefaultInterestRate1795540900000",
    column: "savings_default_interest_rate",
    type: "numeric(5,2)",
    defaultSql: "'5'",
  },
  {
    migration: "DropProfileDashboardWidgetSizes1795541000000",
    column: "dashboard_widget_sizes",
    type: "text",
    defaultSql: null,
  },
  {
    migration: "DropProfileDashboardWidgetConfig1795541100000",
    column: "dashboard_widget_config",
    type: "text",
    defaultSql: null,
  },
];

function spec(migration: string): DroppedProfileColumn {
  const found = DROPPED_PROFILE_COLUMNS.find((c) => c.migration === migration);
  if (!found) throw new Error(`No dropped profile column for ${migration}`);
  return found;
}

async function columnExists(queryRunner: QueryRunner, column: string): Promise<boolean> {
  const rows: unknown[] = await queryRunner.query(
    `SELECT 1 FROM pg_attribute
     WHERE attrelid = to_regclass('user_profiles') AND attname = $1 AND NOT attisdropped`,
    [column],
  );
  return rows.length > 0;
}

/**
 * The buy-to-let profile columns slice 4's migrations read. Once slice 9 has dropped them (or on
 * a database built by synchronize from the current entity), those migrations treat every profile
 * as holding no buy-to-let figures, which is what an empty column would mean.
 */
const SLICE_4_BUY_TO_LET_COLUMNS = [
  "buy_to_let_property_value",
  "buy_to_let_mortgage_balance",
  "buy_to_let_mortgage_rate",
  "buy_to_let_mortgage_type",
] as const;

/**
 * True when every one of the old buy-to-let profile columns is still on user_profiles. All or
 * nothing: slice 4's migrations are recorded as applied everywhere slice 9 runs, so they only run
 * again on a fresh or synchronize-built database, where either all four exist or none do. A
 * re-run of slice 4 after slice 9 stopped part-way (some columns dropped) would treat the
 * remaining figures as absent; their values are in the before-image.
 */
export async function buyToLetProfileColumnsPresent(queryRunner: QueryRunner): Promise<boolean> {
  const rows: unknown[] = await queryRunner.query(
    `SELECT 1 FROM pg_attribute
     WHERE attrelid = to_regclass('user_profiles') AND attname = ANY($1) AND NOT attisdropped`,
    [[...SLICE_4_BUY_TO_LET_COLUMNS]],
  );
  return rows.length === SLICE_4_BUY_TO_LET_COLUMNS.length;
}

async function tableExists(queryRunner: QueryRunner): Promise<boolean> {
  const [{ found }] = await queryRunner.query("SELECT to_regclass($1) IS NOT NULL AS found", [
    PROFILE_COLUMN_DROP_TABLE,
  ]);
  return found === true;
}

async function lockProfiles(queryRunner: QueryRunner): Promise<void> {
  await takeMigrationLock(queryRunner);
  await queryRunner.query("SET LOCAL lock_timeout = '10s'");
  await queryRunner.query(`LOCK TABLE "user_profiles" IN ACCESS EXCLUSIVE MODE`);
}

/** Copies the column's non-default values to the before-image, then drops the column. */
export async function dropProfileColumn(
  queryRunner: QueryRunner,
  migration: string,
): Promise<void> {
  const { column, defaultSql } = spec(migration);
  const logger = new Logger(migration);
  await lockProfiles(queryRunner);
  if (!(await tableExists(queryRunner)))
    await queryRunner.query(
      `CREATE TABLE "${PROFILE_COLUMN_DROP_TABLE}" (
       "id" bigserial PRIMARY KEY,
       "profile_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
       "column_name" text NOT NULL,
       "old_value" text NOT NULL,
       "backfilled_at" timestamptz NOT NULL DEFAULT now(),
       CONSTRAINT "UQ_${PROFILE_COLUMN_DROP_TABLE}_profile_column" UNIQUE ("profile_id", "column_name")
     )`,
    );
  if (!(await columnExists(queryRunner, column))) {
    logger.log(`user_profiles.${column} already dropped; nothing to do`);
    return;
  }
  const [{ kept }] = await queryRunner.query(
    `WITH image AS (
       INSERT INTO "${PROFILE_COLUMN_DROP_TABLE}" ("profile_id", "column_name", "old_value")
       SELECT "id", $1, "${column}"::text FROM "user_profiles"
       WHERE "${column}" IS DISTINCT FROM ${defaultSql ?? "NULL"}
       ON CONFLICT ("profile_id", "column_name")
         DO UPDATE SET "old_value" = EXCLUDED."old_value", "backfilled_at" = now()
       RETURNING 1
     )
     SELECT count(*)::int AS kept FROM image`,
    [column],
  );
  await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "${column}"`);
  logger.log(`user_profiles.${column} dropped; values kept in the before-image: ${kept}`);
}

/** Re-adds the column as the baseline made it and restores the kept values. */
export async function restoreProfileColumn(
  queryRunner: QueryRunner,
  migration: string,
): Promise<void> {
  const { column, type, defaultSql } = spec(migration);
  const logger = new Logger(migration);
  await lockProfiles(queryRunner);
  if (!(await columnExists(queryRunner, column))) {
    const definition = defaultSql === null ? type : `${type} NOT NULL DEFAULT ${defaultSql}`;
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD COLUMN "${column}" ${definition}`);
  }
  if (!(await tableExists(queryRunner))) {
    logger.log(`user_profiles.${column} re-added; no before-image to restore from`);
    return;
  }
  const [{ restored }] = await queryRunner.query(
    `WITH done AS (
       UPDATE "user_profiles" p SET "${column}" = b."old_value"::${type}
       FROM "${PROFILE_COLUMN_DROP_TABLE}" b
       WHERE b."profile_id" = p."id" AND b."column_name" = $1
       RETURNING 1
     )
     SELECT count(*)::int AS restored FROM done`,
    [column],
  );
  await queryRunner.query(`DELETE FROM "${PROFILE_COLUMN_DROP_TABLE}" WHERE "column_name" = $1`, [
    column,
  ]);
  const remaining: unknown[] = await queryRunner.query(
    `SELECT 1 FROM "${PROFILE_COLUMN_DROP_TABLE}" LIMIT 1`,
  );
  if (remaining.length === 0 && migration === DROPPED_PROFILE_COLUMNS[0]?.migration) {
    await queryRunner.query(`DROP TABLE "${PROFILE_COLUMN_DROP_TABLE}"`);
  }
  logger.log(`user_profiles.${column} re-added; values restored: ${restored}`);
}
