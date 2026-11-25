import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * What a consent row records (BE-06, M-PRIV3).
 * - `ai_access`: an AI connection token was minted (target: the token); withdrawn on revoke.
 * - `bank_access`: a bank connection was authorised (target: the connection); withdrawn on
 *   disconnect.
 * - `terms`: retired. Terms acceptance is recorded in `terms_acceptances` (TermsAcceptance), with
 *   both page versions. Nothing writes this kind now; the CHECK constraint still allows it, so any
 *   row written before stays as history (exported, deleted with the account).
 */
const CONSENT_KINDS = ["terms", "ai_access", "bank_access"] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

@Entity("consents")
@Index("IDX_consents_user_kind", ["userId", "kind"])
@Index("IDX_consents_target", ["targetId"])
@Check("CHK_consents_kind", `"kind" IN ('terms', 'ai_access', 'bank_access')`)
export class Consent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "varchar", length: 32 })
  kind: ConsentKind;

  /** What was agreed to: a terms version, or the scopes or provider granted. Identifiers only. */
  @Column({ type: "varchar", length: 128 })
  version: string;

  @Column({ name: "target_id", type: "uuid", nullable: true })
  targetId: string | null;

  @CreateDateColumn({ name: "granted_at", type: "timestamptz" })
  grantedAt: Date;

  @Column({ name: "withdrawn_at", type: "timestamptz", nullable: true })
  withdrawnAt: Date | null;
}
