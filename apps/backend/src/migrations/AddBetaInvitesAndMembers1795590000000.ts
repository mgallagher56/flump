import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

/**
 * Invite links for the invite-only beta. `beta_invites` keeps the SHA-256 hash of each raw token
 * (never the token) and who used it; `beta_members` is everyone who joined through a link, read by
 * primary key on every request while the beta is invite-only. No email anywhere.
 */
const BETA_DOWN_REFUSAL =
  "beta_invites or beta_members has rows; reverting would lock out every invited member";

export class AddBetaInvitesAndMembers1795590000000 implements MigrationInterface {
  name = "AddBetaInvitesAndMembers1795590000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "beta_invites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token_hash" character varying NOT NULL,
        "label" character varying(60),
        "created_by" character varying NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "redeemed_by_user_id" character varying,
        "redeemed_at" timestamptz,
        "revoked_at" timestamptz,
        CONSTRAINT "PK_beta_invites_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_beta_invites_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "CHK_beta_invites_redeemed" CHECK (("redeemed_at" IS NULL) OR ("redeemed_at" IS NOT NULL AND "revoked_at" IS NULL))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_beta_invites_created_at" ON "beta_invites" ("created_at")`,
    );
    // Erasure blanks the invite a user redeemed: a lookup by redeemed_by_user_id.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_beta_invites_redeemed_by" ON "beta_invites" ("redeemed_by_user_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "beta_members" (
        "user_id" character varying NOT NULL,
        "invite_id" uuid,
        "added_at" timestamptz NOT NULL DEFAULT now(),
        "removed_at" timestamptz,
        CONSTRAINT "PK_beta_members_user_id" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_beta_members_invite_id" FOREIGN KEY ("invite_id")
          REFERENCES "beta_invites" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_beta_members_invite_id" ON "beta_members" ("invite_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // Dropping the tables would remove every member's access and every open link. While any row
    // exists the revert is refused unchanged. The locks are taken before the row check, so nothing
    // can be written between the check and the drop.
    const tables: Array<{ invites: boolean; members: boolean }> = await queryRunner.query(
      `SELECT to_regclass('"beta_invites"') IS NOT NULL AS "invites",
              to_regclass('"beta_members"') IS NOT NULL AS "members"`,
    );
    const present = tables[0];
    if (present?.invites && present.members) {
      await queryRunner.query("SET LOCAL lock_timeout = '10s'");
      await queryRunner.query(`LOCK TABLE "beta_members", "beta_invites" IN ACCESS EXCLUSIVE MODE`);
      const rows: Array<{ found: boolean }> = await queryRunner.query(
        `SELECT (EXISTS (SELECT 1 FROM "beta_members") OR EXISTS (SELECT 1 FROM "beta_invites")) AS "found"`,
      );
      if (rows[0]?.found) throw new Error(BETA_DOWN_REFUSAL);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "beta_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "beta_invites"`);
  }
}
