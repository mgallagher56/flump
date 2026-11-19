import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { numericTransformer } from "./numeric.transformer";

// A user's tax records by date, newest first (scanned backwards). (AddUserIdIndexes1794358100000)
@Index("IDX_tax_records_user_date", ["userId", "date"])
// System audit slice 7 (TaxRecordAccountLink1795540000000): a user's records grouped by the account
// they describe, and the (account_id, user_id) foreign key's own index, so deleting an account
// finds its records without a scan.
@Index("IDX_tax_records_user_account", ["userId", "accountId"])
@Index("IDX_tax_records_account_user", ["accountId", "userId"])
@Entity("tax_records")
export class TaxRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "varchar" })
  type: "income" | "expense";

  @Column({ type: "varchar" })
  source: "paye" | "self-employed" | "rental" | "savings";

  @Column({ type: "varchar" })
  category: string;

  @Column()
  name: string;

  @Column({ type: "decimal", precision: 12, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: "varchar", default: "one-off" })
  frequency: "one-off" | "monthly" | "annual";

  @Column({ type: "date" })
  date: string;

  @Column({ type: "date", name: "end_date", nullable: true })
  endDate: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "receipt_filename", type: "varchar", nullable: true })
  receiptFilename: string | null;

  @Column({ name: "receipt_mime_type", type: "varchar", nullable: true })
  receiptMimeType: string | null;

  /**
   * Versioned AES-256-GCM ciphertext (`v<n>:iv:tag:ct`, bound to `id` via AAD, SEC-D / L4) of
   * the receipt base64 data URL. `select: false` keeps it out of every default read (lists,
   * detail, the MCP provider); read it only through the receipt route, which asks for it
   * explicitly (E20-N15).
   */
  @Column({ name: "receipt_data", type: "text", nullable: true, select: false })
  receiptData: string | null;

  /**
   * The account the record describes (system audit slice 7): a rental Property or its mortgage
   * for a rental record, a savings or investment account for a savings record. Always one of the
   * same user's accounts (the service checks it; a composite foreign key enforces it). The
   * (account_id, user_id) foreign key to accounts (id, user_id), ON DELETE SET NULL (account_id),
   * lives in the migration only, as budget_entries.link_account_id's does.
   */
  @Column({ name: "account_id", type: "uuid", nullable: true })
  accountId: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
