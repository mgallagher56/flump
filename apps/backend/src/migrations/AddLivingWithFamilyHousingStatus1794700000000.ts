import type { MigrationInterface, QueryRunner } from "typeorm";
import { takeMigrationLock } from "../config/migration-lock";

// E16 PR 9 (COPY-AUDIT ruling 5): a neutral fourth housing answer, "Living with family or friends",
// stored as 'living_with_family'. Only the CHECK changes: the column, its type and every stored
// value stay as they are. The new CHECK is added NOT VALID then validated, as in
// AddProfileFacts1794355723000 (the table is small and every existing value already passes).
const CONSTRAINT = "CHK_user_profiles_housing_status";
const WITH_FAMILY = `"housing_status" IN ('renting', 'mortgage', 'own_outright', 'living_with_family')`;
const WITHOUT_FAMILY = `"housing_status" IN ('renting', 'mortgage', 'own_outright')`;

async function replaceCheck(queryRunner: QueryRunner, expr: string): Promise<void> {
  await queryRunner.query(`ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"`);
  await queryRunner.query(
    `ALTER TABLE "user_profiles" ADD CONSTRAINT "${CONSTRAINT}" CHECK (${expr}) NOT VALID`,
  );
  await queryRunner.query(`ALTER TABLE "user_profiles" VALIDATE CONSTRAINT "${CONSTRAINT}"`);
}

export class AddLivingWithFamilyHousingStatus1794700000000 implements MigrationInterface {
  name = "AddLivingWithFamilyHousingStatus1794700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    await replaceCheck(queryRunner, WITH_FAMILY);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await takeMigrationLock(queryRunner);
    // The older schema cannot hold the new answer, so it goes back to "not answered" (NULL),
    // which the app reads as unset and never as renting. The amount the person pays is kept.
    await queryRunner.query(
      `UPDATE "user_profiles" SET "housing_status" = NULL WHERE "housing_status" = 'living_with_family'`,
    );
    await replaceCheck(queryRunner, WITHOUT_FAMILY);
  }
}
