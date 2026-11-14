import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Proof that an account was erased (BE-04, owner decision D1 recommended option). It holds no
 * personal data: `subject_hash` is an HMAC-SHA256 of the user id under DELETION_TOMBSTONE_KEY, so
 * the row cannot be turned back into a user id without the key, but a retried deletion of the same
 * user finds it. Kept 24 months (`expires_at`), then purged.
 *
 * `identity_deleted_at` is null while the WorkOS login still has to be removed; a repeat of the
 * same DELETE /user-profile request finishes it.
 */
@Entity("account_deletion_tombstones")
@Index("UQ_account_deletion_tombstones_subject_hash", ["subjectHash"], { unique: true })
@Index("IDX_account_deletion_tombstones_expires_at", ["expiresAt"])
export class AccountDeletionTombstone {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Hex HMAC-SHA256 of the user id (64 characters). Never the user id itself. */
  @Column({ name: "subject_hash", type: "varchar", length: 64 })
  subjectHash: string;

  @Column({ name: "deleted_at", type: "timestamptz" })
  deletedAt: Date;

  @Column({ name: "identity_deleted_at", type: "timestamptz", nullable: true })
  identityDeletedAt: Date | null;

  /** `deleted_at` plus 24 months. */
  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;
}
