import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("bank_connections")
export class BankConnection {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "institution_id" })
  institutionId: string;

  @Column({ name: "institution_name" })
  institutionName: string;

  @Column({ default: "connected" })
  status: "connected" | "disconnected" | "error";

  @Column({ name: "access_token", type: "text", nullable: true })
  accessToken: string | null;

  @Column({ name: "refresh_token", type: "text", nullable: true })
  refreshToken: string | null;

  @Column({ name: "expires_at", type: "timestamp", nullable: true })
  expiresAt: Date | null;

  @Column({ name: "auth_type", type: "varchar", default: "oauth" })
  authType: "oauth" | "token";

  @Column("timestamp", { name: "last_synced_at", default: () => "CURRENT_TIMESTAMP" })
  lastSyncedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
