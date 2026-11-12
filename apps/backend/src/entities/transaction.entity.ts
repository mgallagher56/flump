import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { numericTransformer } from "./numeric.transformer";

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "account_id" })
  accountId: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column("decimal", { precision: 12, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column()
  description: string;

  @Column()
  category: string;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;
}
