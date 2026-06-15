import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("tax_records")
export class TaxRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "varchar" })
  type: "income" | "expense";

  @Column({ type: "varchar" })
  source: "self-employed" | "rental";

  @Column({ type: "varchar" })
  category: string;

  @Column()
  name: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
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

  @Column({ name: "receipt_data", type: "text", nullable: true })
  receiptData: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
