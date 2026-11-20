import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * A person with access to the invite-only beta through an invite link
 * (AddBetaInvitesAndMembers1795590000000). The AuthGuard reads it by primary key on every request
 * while the beta is invite-only. Removal is soft (removed_at), so an admin's mistake can be undone
 * by a new link; retention deletes a removed row after 30 days. No email.
 */
@Entity("beta_members")
export class BetaMember {
  @PrimaryColumn({ name: "user_id" })
  userId: string;

  /** The invite they last used. Null once retention has deleted that invite. */
  @Column({ name: "invite_id", type: "uuid", nullable: true })
  inviteId: string | null;

  @Column({ name: "added_at", type: "timestamptz", default: () => "now()" })
  addedAt: Date;

  @Column({ name: "removed_at", type: "timestamptz", nullable: true })
  removedAt: Date | null;
}
