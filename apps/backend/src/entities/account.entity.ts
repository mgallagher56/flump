import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("accounts")
export class Account {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column()
  name: string;

  @Column({
    type: "varchar",
  })
  type: "Current" | "Saving" | "Mortgage" | "Loan" | "Credit Card" | "Owed";

  @Column("decimal", { precision: 12, scale: 2 })
  balance: number;

  @Column()
  currency: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
