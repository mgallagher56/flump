import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * An invite link to the invite-only beta (AddBetaInvitesAndMembers1795590000000). Only the SHA-256
 * hash of the raw token is kept; the token itself is shown once, to the admin who created it. No
 * email is stored. Retention deletes it 30 days after it closes (jobs/retention.ts).
 */
@Entity("beta_invites")
@Index("IDX_beta_invites_created_at", ["createdAt"])
@Index("IDX_beta_invites_redeemed_by", ["redeemedByUserId"])
export class BetaInvite {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "token_hash", unique: true })
  tokenHash: string;

  /** What the admin typed to remember who it was for, at most 60 characters. */
  @Column({ type: "varchar", length: 60, nullable: true })
  label: string | null;

  /** The admin (a BETA_ADMIN_USER_IDS entry) who created it. */
  @Column({ name: "created_by" })
  createdBy: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  /** Who used it. Blanked when that account is erased. */
  @Column({ name: "redeemed_by_user_id", type: "varchar", nullable: true })
  redeemedByUserId: string | null;

  @Column({ name: "redeemed_at", type: "timestamptz", nullable: true })
  redeemedAt: Date | null;

  /** Set when an admin cancels the link. */
  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt: Date | null;
}
