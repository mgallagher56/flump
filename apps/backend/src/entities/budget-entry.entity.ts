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
// Review of PR 783 (migration AddBudgetEntryLinksTo1795440000000).
@Check(
  "CHK_budget_entries_links_to",
  `"links_to" IS NULL OR "links_to" IN ('take-home', 'housing')`,
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

  /**
   * The saved detail this row was replaced with ("take-home" or "housing"), or null. Set when the
   * person chooses "Use your take-home pay" or "Use your saved rent" for a row; its amount is then
   * 0 and the engine reads the profile's figure in its place, so one value is stored.
   */
  @Column({ name: "links_to", type: "varchar", length: 16, nullable: true })
  linksTo: "take-home" | "housing" | null;

  @Column({ name: "is_default", default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
