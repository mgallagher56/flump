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
  type: "Current" | "Saving" | "Mortgage" | "Loan" | "Credit Card" | "Owed" | "Investment";

  @Column("decimal", { precision: 12, scale: 2 })
  balance: number;

  @Column()
  currency: string;

  @Column({ name: "connection_id", type: "uuid", nullable: true })
  connectionId: string | null;

  @Column({ name: "external_account_id", type: "varchar", nullable: true })
  externalAccountId: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
