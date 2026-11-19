// Fixture entity for scripts/check-value-map.test.ts. Read as text, never imported.
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("accounts")
export class Account {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column()
  name: string;

  @Column({ type: "decimal", default: () => "0" })
  balance: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
