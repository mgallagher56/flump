import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import { numericTransformer } from "./numeric.transformer";

@Entity("accounts")
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
    | "Pension";

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

  @Column()
  currency: string;

  @Column({ name: "connection_id", type: "uuid", nullable: true })
  connectionId: string | null;

  @Column({ name: "external_account_id", type: "varchar", nullable: true })
  externalAccountId: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
