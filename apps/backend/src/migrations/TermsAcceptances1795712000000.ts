import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// Terms acceptance at sign-up (legal pages review follow-up). Additive only: one new table,
// `terms_acceptances`, holding which version of the terms of use a person agreed to, which version
// of the privacy notice they were shown, and when. Nothing else: no email, no IP address, no
// device. The primary key is the user and the version pair, so agreeing to the same pair twice
// writes nothing, and a new pair adds a row (earlier rows stay as the record of what applied when).
// The AuthGuard reads it by user id on every authenticated request; the key's leading column
// serves that read.
// No existing data is read or changed. Live-safe: a new empty table under a lock timeout.
// down() drops the table: the record of who agreed to what is lost, no financial data is.
export class TermsAcceptances1795712000000 implements MigrationInterface {
  name = "TermsAcceptances1795712000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query("SET LOCAL lock_timeout = '10s'");
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "terms_acceptances" (
         "user_id" character varying NOT NULL,
         "terms_version" character varying(16) NOT NULL,
         "privacy_notice_version" character varying(16) NOT NULL,
         "accepted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "PK_terms_acceptances" PRIMARY KEY ("user_id", "terms_version", "privacy_notice_version"),
         CONSTRAINT "CHK_terms_acceptances_terms_version" CHECK ("terms_version" ~ '^[0-9]+\\.[0-9]+$'),
         CONSTRAINT "CHK_terms_acceptances_privacy_version" CHECK ("privacy_notice_version" ~ '^[0-9]+\\.[0-9]+$')
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await queryRunner.query(`DROP TABLE IF EXISTS "terms_acceptances"`);
  }
}
