import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

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

  @Column({ name: "is_default", default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
