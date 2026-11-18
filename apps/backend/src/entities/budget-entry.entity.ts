import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

// A user's budget entries in creation order. (AddUserIdIndexes1794358100000)
@Index("IDX_budget_entries_user_created", ["userId", "createdAt"])
// E34 C1 (migration AddBudgetEntryJointShare1795350000000). Declared here too so a
// synchronize-built dev database keeps them.
@Check("CHK_budget_entries_ownership", `"ownership" IN ('sole', 'joint')`)
@Check(
  "CHK_budget_entries_share_percent",
  `"share_percent" IS NULL OR ("share_percent" >= 1 AND "share_percent" <= 100)`,
)
@Entity("budget_entries")
export class BudgetEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "varchar" })
  category: string;

  @Column()
  name: string;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (value !== null && value !== undefined ? Number(value) : 0),
    },
  })
  amount: number;

  @Column({ type: "varchar", default: "monthly" })
  frequency: "monthly" | "annual" | "weekly";

  @Column({ name: "is_income", default: false })
  isIncome: boolean;

  @Column({ name: "is_primary_income", default: false })
  isPrimaryIncome: boolean;

  @Column({ name: "is_essential", default: true })
  isEssential: boolean;

  @Column({ type: "varchar", nullable: true })
  notes: string | null;

  /** E34 C1: "sole" (default) or "joint", as on accounts. */
  @Column({ type: "varchar", default: "sole" })
  ownership: "sole" | "joint";

  /** E34 C1: the user's percentage share (1-100) when joint; null when sole. */
  @Column({ name: "share_percent", type: "smallint", nullable: true })
  sharePercent: number | null;

  @Column({ name: "is_default", default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
