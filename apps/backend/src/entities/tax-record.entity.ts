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
   * Base64 data URL. `select: false` keeps it out of every default read (lists, detail, the MCP
   * provider); read it only through the receipt route, which asks for it explicitly (E20-N15).
   */
  @Column({ name: "receipt_data", type: "text", nullable: true, select: false })
  receiptData: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
