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
// System audit decision 1 (migrations AddBudgetEntryLinkKind1795440000000 and, for the savings
// and debt kinds, LinkBudgetLinesToAccounts1795490000000).
@Check(
  "CHK_budget_entries_link_kind",
  `"link_kind" IS NULL OR "link_kind" IN ('take_home', 'housing', 'savings', 'debt')`,
)
// Only a savings or debt line names an account.
@Check(
  "CHK_budget_entries_link_account",
  `"link_account_id" IS NULL OR ("link_kind" IS NOT NULL AND "link_kind" IN ('savings', 'debt'))`,
)
// One line per user per profile fact, partial over those two kinds only.
@Index("UQ_budget_entries_user_link_kind", ["userId", "linkKind"], {
  unique: true,
  where: `"link_kind" IN ('take_home', 'housing')`,
})
// One line per account. The (link_account_id, user_id) foreign key to accounts (id, user_id),
// ON DELETE SET NULL (link_account_id), lives in the migration only.
@Index("UQ_budget_entries_link_account", ["linkAccountId"], {
  unique: true,
  where: `"link_account_id" IS NOT NULL`,
})
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
   * The saved fact this line is linked to ("take_home", "housing", "savings" or "debt"), or null.
   * Set when the person chooses "Use your take-home pay", "Use your saved rent" or "Link this line"
   * for a row. Its amount is then stored as 0 and never read: the profile or the account holds the
   * only stored value and the engine resolves the line.
   */
  @Column({ name: "link_kind", type: "varchar", length: 16, nullable: true })
  linkKind: "take_home" | "housing" | "savings" | "debt" | null;

  /**
   * The account a "savings" or "debt" line reads: its monthly saving or payment at the person's
   * share. Always one of the same user's accounts (the service checks it; a composite foreign key
   * enforces it). Set to null when that account is deleted: the line then reads "Not set".
   */
  @Column({ name: "link_account_id", type: "uuid", nullable: true })
  linkAccountId: string | null;

  @Column({ name: "is_default", default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
