import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

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

  @Column("decimal", { precision: 12, scale: 2 })
  balance: number;

  @Column("decimal", { name: "interest_rate", precision: 5, scale: 2, nullable: true })
  interestRate: number | null;

  @Column("decimal", { name: "monthly_contribution", precision: 12, scale: 2, nullable: true })
  monthlyContribution: number | null;

  @Column()
  currency: string;

  @Column({ name: "connection_id", type: "uuid", nullable: true })
  connectionId: string | null;

  @Column({ name: "external_account_id", type: "varchar", nullable: true })
  externalAccountId: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
