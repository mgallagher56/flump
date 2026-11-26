import { CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * A household of two people (E34 C3, AddHouseholds1795730000000). It holds no user id and owns no
 * data: who is in it lives in `household_members`, and each person's accounts stay their own rows.
 * Made only when an invitation is accepted, and deleted when either person leaves or is erased.
 */
@Entity("households")
export class Household {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
