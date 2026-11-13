import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { numericTransformer } from "./numeric.transformer";

// One row per account per month (E23 D22); see UniqueAccountDetailMonth1794356000000.
@Index("UQ_account_details_account_year_month", ["accountId", "year", "month"], { unique: true })
@Entity("account_details")
export class AccountDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "account_id" })
  accountId: string;

  @Column()
  month: number;

  @Column("decimal", { precision: 12, scale: 2, transformer: numericTransformer })
  value: number;

  @Column()
  year: number;
}
