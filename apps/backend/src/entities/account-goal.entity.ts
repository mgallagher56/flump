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

/**
 * Optional user-set goal on an account (E35 Set 2). One goal per account, with no defaults or
 * suggestions: any non-negative amount, optional target date, and optional label.
 */
@Entity("account_goals")
@Index("UQ_account_goals_account_id", ["accountId"], { unique: true })
@Index("IDX_account_goals_user_account", ["userId", "accountId"])
@Check("CHK_account_goals_target_amount", `"target_amount" IS NULL OR "target_amount" >= 0`)
export class AccountGoal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "account_id", type: "uuid" })
  accountId: string;

  @Column("decimal", {
    name: "target_amount",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  targetAmount: number | null;

  @Column({ name: "target_date", type: "date", nullable: true })
  targetDate: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  label: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
