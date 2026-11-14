import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

// A user's connections, newest first. (AddUserIdIndexes1794358100000)
@Index("IDX_bank_connections_user_created", ["userId", "createdAt"])
@Entity("bank_connections")
// BE-12 (audit H4): one connection per user per bank (migration BankSyncIntegrity1794358400000).
@Index("UQ_bank_connections_user_institution", ["userId", "institutionId"], { unique: true })
export class BankConnection {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "institution_id" })
  institutionId: string;

  @Column({ name: "institution_name" })
  institutionName: string;

  /** `needs_reconnect`: the bank rejected the stored consent (audit M13); the user must reconnect. */
  @Column({ default: "connected" })
  status: "connected" | "disconnected" | "error" | "needs_reconnect";

  @Column({ name: "access_token", type: "text", nullable: true })
  accessToken: string | null;

  @Column({ name: "refresh_token", type: "text", nullable: true })
  refreshToken: string | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ name: "auth_type", type: "varchar", default: "oauth" })
  authType: "oauth" | "token";

  @Column("timestamptz", { name: "last_synced_at", default: () => "CURRENT_TIMESTAMP" })
  lastSyncedAt: Date;

  /** Sync lease (BE-12, audit H4): set while a sync runs, so a second one gets 409. */
  @Column({ name: "sync_started_at", type: "timestamptz", nullable: true })
  syncStartedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
