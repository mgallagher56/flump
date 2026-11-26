import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * An open household invitation link (E34 C3, AddHouseholds1795730000000). Only the SHA-256 hash of
 * the raw token is kept; the token is shown once, to the person who made it. Nothing about the
 * invited person is stored. One open link per person (`UQ_household_invitations_inviter`). A used
 * or cancelled link is deleted at once; retention deletes an expired one (jobs/retention.ts).
 */
@Entity("household_invitations")
@Unique("UQ_household_invitations_token_hash", ["tokenHash"])
@Unique("UQ_household_invitations_inviter", ["inviterUserId"])
export class HouseholdInvitation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "token_hash", type: "varchar" })
  tokenHash: string;

  @Column({ name: "inviter_user_id", type: "varchar" })
  inviterUserId: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;
}
