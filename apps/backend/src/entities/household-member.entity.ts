import { Check, Column, Entity, PrimaryColumn, Unique } from "typeorm";

/**
 * One person in a household (E34 C3, AddHouseholds1795660000000). Two equal people: no role and no
 * "created by" (G6). One household per person (`UQ_household_members_user_id`) and two people at
 * most (`UQ_household_members_household_slot` with slot 1 or 2), both enforced by the database.
 * FK_household_members_household: households(id) ON DELETE CASCADE, so closing a household removes
 * both rows. Read only inside modules/household and the privacy services (backend law
 * check-household-members).
 */
@Entity("household_members")
@Unique("UQ_household_members_user_id", ["userId"])
@Unique("UQ_household_members_household_slot", ["householdId", "slot"])
@Check("CHK_household_members_slot", `"slot" IN (1, 2)`)
export class HouseholdMember {
  @PrimaryColumn({ name: "household_id", type: "uuid" })
  householdId: string;

  @PrimaryColumn({ name: "user_id", type: "varchar" })
  userId: string;

  @Column({ type: "smallint" })
  slot: number;

  /** Whether this person shows their joint accounts in the household summary. Off by default (G2). */
  @Column({ name: "shares_joint_summary", type: "boolean", default: false })
  sharesJointSummary: boolean;

  @Column({ name: "joined_at", type: "timestamptz", default: () => "now()" })
  joinedAt: Date;
}
