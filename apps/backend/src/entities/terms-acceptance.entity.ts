import { CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

/**
 * One agreement to the terms of use, with the privacy notice shown at the time (terms acceptance).
 * The terms are a contract the person agrees to; the privacy notice is information they are shown,
 * not something they consent to, so the record says "shown" for it. Nothing else is stored.
 * One row per user and version pair; a new pair adds a row and earlier rows stay as history.
 * Deleted with the account; kept on a financial reset.
 */
@Entity("terms_acceptances")
export class TermsAcceptance {
  @PrimaryColumn({ name: "user_id", type: "varchar" })
  userId: string;

  /** The terms of use version agreed to (`LEGAL_PAGES` terms `version`). */
  @PrimaryColumn({ name: "terms_version", type: "varchar", length: 16 })
  termsVersionAgreed: string;

  /** The privacy notice version shown (`LEGAL_PAGES` privacy `version`). */
  @PrimaryColumn({ name: "privacy_notice_version", type: "varchar", length: 16 })
  privacyNoticeVersionShown: string;

  @CreateDateColumn({ name: "accepted_at", type: "timestamptz" })
  acceptedAt: Date;
}
