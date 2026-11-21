import type { WorkLogIncomeSource } from "@flump/api-contract";
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

@Entity("work_log_entries")
@Index("IDX_work_log_entries_user_date", ["userId", "date"])
@Index("IDX_work_log_entries_user_invoice", ["userId", "invoiceId"])
@Index("idx_work_log_entries_invoice_id", ["invoiceId"])
@Check(
  "CHK_work_log_entries_bounds",
  `"hours_worked" >= 0 AND "hourly_rate" >= 0 AND "amount" >= 0 AND "income_source" IN ('self-employed')`,
)
export class WorkLogEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "text" })
  description: string;

  @Column("decimal", {
    name: "hours_worked",
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  hoursWorked: number;

  @Column("decimal", {
    name: "hourly_rate",
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  hourlyRate: number;

  @Column("decimal", {
    name: "amount",
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ name: "client_name", type: "varchar", nullable: true })
  clientName: string | null;

  @Column({ name: "income_source", type: "varchar", default: "self-employed" })
  incomeSource: WorkLogIncomeSource;

  /**
   * Foreign key to `invoices.id` (`ON DELETE SET NULL`) is declared in the SQL migration only,
   * keeping `relationsOf(WorkLogEntry)` empty for the user-data registry law.
   */
  @Column({ name: "invoice_id", type: "uuid", nullable: true })
  invoiceId: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
