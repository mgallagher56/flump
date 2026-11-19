import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { numericTransformer } from "./numeric.transformer";

// Every page loads a user's accounts in creation order. (AddUserIdIndexes1794358100000)
@Index("IDX_accounts_user_created", ["userId", "createdAt"])
@Entity("accounts")
// BE-05 stored-balance rule (migration LiabilitySignRule1794358050000). Declared here too so a
// synchronize-built dev database keeps it instead of dropping it as an unknown check.
@Check(
  "CHK_accounts_liability_balance_non_positive",
  `"type" NOT IN ('Mortgage', 'Credit Card', 'Loan', 'Overdraft', 'Student Loan') OR "balance" <= 0`,
)
@Check("CHK_accounts_ownership", `"ownership" IN ('sole', 'joint')`)
// System audit slice 4 (AddAccountLinkAndRepaymentType1795470000000).
@Check(
  "CHK_accounts_repayment_type",
  `"repayment_type" IS NULL OR "repayment_type" IN ('repayment', 'interest-only')`,
)
@Check("CHK_accounts_linked_not_self", `"linked_account_id" IS NULL OR "linked_account_id" <> "id"`)
@Check(
  "CHK_accounts_share_percent",
  `"share_percent" IS NULL OR ("share_percent" >= 1 AND "share_percent" <= 100)`,
)
// BE-12 (audit H4): one row per synced bank account (migration BankSyncIntegrity1794358400000).
// System audit slice 5 (LinkBudgetLinesToAccounts1795490000000): the key a budget line's
// (link_account_id, user_id) foreign key references, so a line can only read its own user's account.
@Index("UQ_accounts_id_user_id", ["id", "userId"], { unique: true })
@Index("UQ_accounts_user_connection_external", ["userId", "connectionId", "externalAccountId"], {
  unique: true,
  where: '"connection_id" IS NOT NULL AND "external_account_id" IS NOT NULL',
})
export class Account {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column()
  name: string;

  @Column({
    type: "varchar",
  })
  type:
    | "Current"
    | "Saving"
    | "Mortgage"
    | "Loan"
    | "Credit Card"
    | "Owed"
    | "Investment"
    | "Pension"
    | "Property"
    | "Student Loan"
    | "Overdraft";

  /**
   * Optional subtype (e.g. easy_access, cash_isa, stocks_and_shares_isa, residential_mortgage,
   * btl_mortgage; `home` or `rental` on a Property; car_finance, buy_now_pay_later or other_loan on
   * a Loan).
   */
  @Column({ name: "account_subtype", type: "varchar", nullable: true })
  accountSubtype: string | null;

  @Column("decimal", { precision: 12, scale: 2, transformer: numericTransformer })
  balance: number;

  @Column("decimal", {
    name: "interest_rate",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  interestRate: number | null;

  @Column("decimal", {
    name: "monthly_contribution",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  monthlyContribution: number | null;

  /** Credit Card and Overdraft accounts: optional credit/overdraft limit. */
  @Column("decimal", {
    name: "credit_limit",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  creditLimit: number | null;

  /** Credit Card and Overdraft accounts: optional 0% promotional interest end date. */
  @Column({ name: "promo_zero_percent_until", type: "date", nullable: true })
  promoZeroPercentUntil: string | null;

  @Column({ name: "term_months", type: "integer", nullable: true })
  termMonths: number | null;

  @Column({ name: "fixed_rate_end_date", type: "date", nullable: true })
  fixedRateEndDate: string | null;

  @Column({ name: "is_current", type: "boolean", default: true, nullable: true })
  isCurrent: boolean;

  @Column({ default: "GBP" })
  currency: string;

  /** Student Loan accounts only: PLAN_1 | PLAN_2 | PLAN_4 | PLAN_5 | POSTGRAD. */
  @Column({ name: "student_loan_plan", type: "varchar", nullable: true })
  studentLoanPlan: string | null;

  /** E34 Slice 2: "sole" (default) or "joint" for eligible accounts (never ISAs or pensions). */
  @Column({ type: "varchar", default: "sole" })
  ownership: "sole" | "joint";

  /** E34 Slice 2: percentage share (1-100) when ownership is "joint"; null when "sole". */
  @Column({ name: "share_percent", type: "integer", nullable: true })
  sharePercent: number | null;

  /**
   * Mortgage accounts: the Property account the mortgage is on (system audit slice 4).
   * FK_accounts_linked_account: accounts(id) ON DELETE SET NULL
   * (AddAccountLinkAndRepaymentType1795470000000), so deleting the property unlinks the mortgage.
   */
  @Index("IDX_accounts_linked_account")
  @Column({ name: "linked_account_id", type: "uuid", nullable: true })
  linkedAccountId: string | null;

  /** Mortgage accounts: "repayment" or "interest-only"; null when not set. */
  @Column({ name: "repayment_type", type: "varchar", nullable: true })
  repaymentType: "repayment" | "interest-only" | null;

  @Column({ name: "connection_id", type: "uuid", nullable: true })
  connectionId: string | null;

  @Column({ name: "external_account_id", type: "varchar", nullable: true })
  externalAccountId: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  /** The resource version behind the ETag (BE-09, audit L15). AddIdempotencyKeysAndAccountVersion1794632100000. */
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
