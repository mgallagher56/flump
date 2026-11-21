import type { InvoiceStatus } from "@flump/api-contract";
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

@Entity("invoices")
@Index("UQ_invoices_user_number", ["userId", "invoiceNumber"], { unique: true })
@Index("IDX_invoices_user_issue_date", ["userId", "issueDate"])
@Index("idx_invoices_tax_record_id", ["taxRecordId"])
@Check(
  "CHK_invoices_bounds",
  `"status" IN ('draft', 'issued', 'paid', 'void') AND "subtotal" >= 0 AND ("vat_rate_pct" IS NULL OR ("vat_rate_pct" >= 0 AND "vat_rate_pct" <= 100)) AND "vat_amount" >= 0 AND "total" >= 0`,
)
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "invoice_number", type: "varchar" })
  invoiceNumber: string;

  @Column({ type: "varchar", default: "draft" })
  status: InvoiceStatus;

  @Column({ name: "client_name", type: "varchar" })
  clientName: string;

  @Column({ name: "client_email", type: "varchar", nullable: true })
  clientEmail: string | null;

  @Column({ name: "client_address", type: "text", nullable: true })
  clientAddress: string | null;

  @Column({ name: "issue_date", type: "date" })
  issueDate: string;

  @Column({ name: "due_date", type: "date" })
  dueDate: string;

  @Column({ name: "paid_date", type: "date", nullable: true })
  paidDate: string | null;

  @Column("decimal", {
    name: "subtotal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  subtotal: number;

  @Column("decimal", {
    name: "vat_rate_pct",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  vatRatePct: number | null;

  @Column("decimal", {
    name: "vat_amount",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  vatAmount: number;

  @Column("decimal", {
    name: "total",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  total: number;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  /**
   * Foreign key to `tax_records.id` (`ON DELETE SET NULL`) is declared in the SQL migration only,
   * keeping `relationsOf(Invoice)` empty for the user-data registry law.
   */
  @Column({ name: "tax_record_id", type: "uuid", nullable: true })
  taxRecordId: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
