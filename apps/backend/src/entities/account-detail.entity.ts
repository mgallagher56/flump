import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("account_details")
export class AccountDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "account_id" })
  accountId: string;

  @Column()
  month: number;

  @Column("decimal", { precision: 12, scale: 2 })
  value: number;

  @Column()
  year: number;
}
