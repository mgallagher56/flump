import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
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
// BE-12 (audit H4): one row per synced bank account (migration BankSyncIntegrity1794358400000).
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

  @Column({ name: "connection_id", type: "uuid", nullable: true })
  connectionId: string | null;

  @Column({ name: "external_account_id", type: "varchar", nullable: true })
  externalAccountId: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
