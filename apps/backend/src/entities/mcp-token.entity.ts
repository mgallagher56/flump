import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// A user's MCP tokens, newest first. (AddUserIdIndexes1794358100000)
@Index("IDX_mcp_tokens_user_created", ["userId", "createdAt"])
@Entity("mcp_tokens")
export class McpToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column()
  name: string;

  @Column({ name: "token_hash", unique: true })
  tokenHash: string;

  @Column({ name: "token_prefix" })
  tokenPrefix: string;

  @Column({ type: "simple-array", default: "mcp:read:anonymized,mcp:simulate" })
  scopes: string[];

  @Column({ name: "anonymize_institutions", default: true })
  anonymizeInstitutions: boolean;

  @Column({ name: "expires_at", type: "timestamp", nullable: true })
  expiresAt: Date | null;

  @Column({ name: "last_used_at", type: "timestamp", nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: "total_tool_calls", default: 0 })
  totalToolCalls: number;

  @Column({ name: "revoked_at", type: "timestamp", nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
