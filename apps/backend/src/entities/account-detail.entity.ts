import { Check, Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { numericTransformer } from "./numeric.transformer";

/** How a monthly value got into the table (E30). */
export const ACCOUNT_DETAIL_SOURCES = [
  "onboarding",
  "manual",
  "connected",
  "backfill",
  "agent",
] as const;
export type AccountDetailSource = (typeof ACCOUNT_DETAIL_SOURCES)[number];

/**
 * One value per account per calendar month (a monthly snapshot). `year`/`month` are the
 * Europe/London month of `asOfDate` (a CHECK enforces it); the unique key makes "latest write
 * wins" a database fact. Carry-forward for months with no row is computed at read time, never
 * stored (E30 D5).
 */
@Entity("account_details")
// One row per account per month (E23 D22, UniqueAccountDetailMonth1794356000000); E30 reuses this
// index as its unique key rather than adding a second one.
@Index("UQ_account_details_account_year_month", ["accountId", "year", "month"], { unique: true })
// The agent's per-user reads filter on user_id and walk each account in month order
// (AccountDetailsUserMonthIndex1794357300000).
@Index("IDX_account_details_user_account_year_month", ["userId", "accountId", "year", "month"])
@Check("CHK_account_details_month", `"month" BETWEEN 1 AND 12`)
@Check(
  "CHK_account_details_source",
  `"source" IN ('onboarding', 'manual', 'connected', 'backfill', 'agent')`,
)
@Check(
  "CHK_account_details_as_of_month",
  `"year" = EXTRACT(YEAR FROM "as_of_date") AND "month" = EXTRACT(MONTH FROM "as_of_date")`,
)
export class AccountDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "account_id" })
  accountId: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column()
  month: number;

  @Column("decimal", { precision: 12, scale: 2, transformer: numericTransformer })
  value: number;

  @Column()
  year: number;

  /** YYYY-MM-DD, the day the value is as at. Its Europe/London month is the month key. */
  @Column("date", { name: "as_of_date" })
  asOfDate: string;

  @Column({ type: "varchar", default: "manual" })
  source: AccountDetailSource;

  /**
   * The import batch that wrote this value (E17 re-plan PR C), else null. Every non-import write
   * clears it, so "still owned by the batch" is `import_batch_id = batch AND source = 'agent'`.
   */
  @Index("IDX_account_details_import_batch")
  @Column({ name: "import_batch_id", type: "uuid", nullable: true })
  importBatchId: string | null;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
