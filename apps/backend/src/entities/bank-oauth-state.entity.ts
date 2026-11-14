import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * A pending bank OAuth consent (audit M4): random, single-use, short-lived. Only a hash of the
 * state is stored, so a database read cannot replay it; the PKCE verifier is encrypted with the
 * state hash as associated data. Rows are deleted when consumed or once expired.
 */
@Entity("bank_oauth_states")
@Index("IDX_bank_oauth_states_user_id", ["userId"])
export class BankOAuthState {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "institution_id" })
  institutionId: string;

  /** SHA-256 hex of the state sent to the provider. */
  @Index("UQ_bank_oauth_states_state_hash", { unique: true })
  @Column({ name: "state_hash", type: "char", length: 64 })
  stateHash: string;

  @Column({ name: "code_verifier", type: "text" })
  codeVerifier: string;

  @Column({ name: "redirect_uri", type: "text" })
  redirectUri: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
