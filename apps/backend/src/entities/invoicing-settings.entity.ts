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

@Entity("invoicing_settings")
@Index("UQ_invoicing_settings_user_id", ["userId"], { unique: true })
@Check(
  "CHK_invoicing_settings_bounds",
  `("default_hourly_rate" IS NULL OR "default_hourly_rate" >= 0) AND "next_invoice_sequence" >= 1 AND "default_payment_terms_days" >= 0`,
)
export class InvoicingSettings {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column("decimal", {
    name: "default_hourly_rate",
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  defaultHourlyRate: number | null;

  @Column({ name: "business_name", type: "varchar", nullable: true })
  businessName: string | null;

  @Column({ name: "business_address", type: "text", nullable: true })
  businessAddress: string | null;

  @Column({ name: "business_email", type: "varchar", nullable: true })
  businessEmail: string | null;

  @Column({ name: "vat_number", type: "varchar", nullable: true })
  vatNumber: string | null;

  @Column({ name: "invoice_prefix", type: "varchar", default: "INV-" })
  invoicePrefix: string;

  @Column({ name: "next_invoice_sequence", type: "integer", default: 1 })
  nextInvoiceSequence: number;

  @Column({ name: "default_payment_terms_days", type: "integer", default: 30 })
  defaultPaymentTermsDays: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
