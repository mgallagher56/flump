import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { numericTransformer } from "./numeric.transformer";

// Lists a user's transactions newest first (finance.service getTransactions, agent queries). (AddUserIdIndexes1794358100000)
@Index("IDX_transactions_user_timestamp", ["userId", "timestamp"])
// Per-account reads and deletes, and the import revert NOT EXISTS check. (AddUserIdIndexes1794358100000)
@Index("IDX_transactions_account", ["accountId"])
@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** FK_transactions_account: accounts(id) ON DELETE CASCADE (AccountIdForeignKeys1794358200000). */
  @Column({ name: "account_id", type: "uuid" })
  accountId: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column("decimal", { precision: 12, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column()
  description: string;

  @Column()
  category: string;

  @Column("timestamptz", { default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;
}
