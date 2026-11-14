import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// BE-04 (account deletion). Additive only: creates `account_deletion_tombstones`, one row per
// erased account holding a keyed hash of the user id, the deletion time, when the WorkOS login was
// removed and when the row expires (24 months). No user data is read or changed.
// down() drops the table. Rolling back loses the deletion proofs, not any user data.
export class AddAccountDeletionTombstones1794622492000 implements MigrationInterface {
  name = "AddAccountDeletionTombstones1794622492000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "account_deletion_tombstones" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "subject_hash" character varying(64) NOT NULL,
         "deleted_at" TIMESTAMP NOT NULL,
         "identity_deleted_at" TIMESTAMP,
         "expires_at" TIMESTAMP NOT NULL,
         CONSTRAINT "PK_account_deletion_tombstones" PRIMARY KEY ("id")
       )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_account_deletion_tombstones_subject_hash"
         ON "account_deletion_tombstones" ("subject_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_account_deletion_tombstones_expires_at"
         ON "account_deletion_tombstones" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
    await queryRunner.query(`DROP TABLE IF EXISTS "account_deletion_tombstones"`);
  }
}
