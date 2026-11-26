import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Households for couples (E34 C3, behind the household switch). Additive only.
 * - `households`: an id and a creation time. No user id; it owns no data.
 * - `household_members`: who is in which household. One household per person (UNIQUE user_id) and
 *   two people at most (UNIQUE household_id, slot with slot 1 or 2). No role, no "created by" (G6).
 *   Closing a household (ON DELETE CASCADE) removes both rows.
 * - `household_invitations`: the SHA-256 hash of each open link (never the token) and who made it.
 *   One open link per person. Nothing about the invited person.
 * No foreign key to any users table: users live in WorkOS.
 */
const HOUSEHOLD_DOWN_REFUSAL =
  "households, household_members or household_invitations has rows; reverting would close every household";

export class AddHouseholds1795660000000 implements MigrationInterface {
  name = "AddHouseholds1795660000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "households" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_households_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "household_members" (
        "household_id" uuid NOT NULL,
        "user_id" character varying NOT NULL,
        "slot" smallint NOT NULL,
        "shares_joint_summary" boolean NOT NULL DEFAULT false,
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_household_members" PRIMARY KEY ("household_id", "user_id"),
        CONSTRAINT "UQ_household_members_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_household_members_household_slot" UNIQUE ("household_id", "slot"),
        CONSTRAINT "CHK_household_members_slot" CHECK ("slot" IN (1, 2)),
        CONSTRAINT "FK_household_members_household" FOREIGN KEY ("household_id")
          REFERENCES "households" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "household_invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token_hash" character varying NOT NULL,
        "inviter_user_id" character varying NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        CONSTRAINT "PK_household_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_household_invitations_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "UQ_household_invitations_inviter" UNIQUE ("inviter_user_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // Dropping the tables would close every household and void every open link. While any row
    // exists the revert is refused unchanged. The locks are taken before the row check, so nothing
    // can be written between the check and the drop.
    const tables: Array<{ households: boolean; members: boolean; invitations: boolean }> =
      await queryRunner.query(
        `SELECT to_regclass('"households"') IS NOT NULL AS "households",
                to_regclass('"household_members"') IS NOT NULL AS "members",
                to_regclass('"household_invitations"') IS NOT NULL AS "invitations"`,
      );
    const present = tables[0];
    if (present?.households && present.members && present.invitations) {
      await queryRunner.query("SET LOCAL lock_timeout = '10s'");
      await queryRunner.query(
        `LOCK TABLE "household_members", "households", "household_invitations" IN ACCESS EXCLUSIVE MODE`,
      );
      const rows: Array<{ found: boolean }> = await queryRunner.query(
        `SELECT (EXISTS (SELECT 1 FROM "households")
                 OR EXISTS (SELECT 1 FROM "household_members")
                 OR EXISTS (SELECT 1 FROM "household_invitations")) AS "found"`,
      );
      if (rows[0]?.found) throw new Error(HOUSEHOLD_DOWN_REFUSAL);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "household_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "households"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "household_invitations"`);
  }
}
