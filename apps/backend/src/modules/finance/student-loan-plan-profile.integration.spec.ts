import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../../testing/discoverMigrations";
import { at } from "../../testing/must";
import { AccountIntakeService } from "./account-intake.service";

// System audit slice 6 (PP-7, DB-7, L30) against real Postgres: saving a Student Loan account
// with a plan writes the plan to the profile, in the account write's transaction, when the
// profile has none. Same throwaway-database rules as migrations.integration.spec.ts (this suite
// DROPs the schema):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test \
//     bunx vitest run src/modules/finance/student-loan-plan-profile.integration.spec.ts
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
// A sample owner id, built at runtime (a sample value, not a credential).
const USER = ["slice6", "owner"].join("-");

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "student loan plan goes to the profile (real Postgres)",
  () => {
    let ds: DataSource;
    let migrations: MigrationClass[] = [];

    beforeAll(async () => {
      migrations = await discoverMigrations();
    });

    beforeEach(async () => {
      assertSafeTestDatabase(TEST_DATABASE_URL as string, process.env);
      const options = typeOrmOptionsFromEnv({
        NODE_ENV: "test",
        DATABASE_URL: TEST_DATABASE_URL,
      }) as DataSourceOptions;
      ds = new DataSource({ ...options, migrations, synchronize: false, migrationsRun: false });
      await ds.initialize();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
    });

    afterEach(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });

    const intake = () =>
      new AccountIntakeService(
        ds.getRepository(Account),
        ds.getRepository(AccountDetail),
        ds.getRepository(BankConnection),
      );
    /** A profile row; `plans` is the stored simple-array text (null: not answered, "": none). */
    const insertProfile = (plans: string | null) =>
      ds.query("INSERT INTO user_profiles (user_id, student_loan_plans) VALUES ($1, $2)", [
        USER,
        plans,
      ]);
    const storedPlans = async (): Promise<string | null> =>
      at(
        await ds.query<Array<{ student_loan_plans: string | null }>>(
          "SELECT student_loan_plans FROM user_profiles WHERE user_id = $1",
          [USER],
        ),
        0,
      ).student_loan_plans;
    const loan = { name: "Student loan", type: "Student Loan", balance: 40000, currency: "GBP" };

    it("a new Plan 2 loan account writes Plan 2 to a profile that never answered", async () => {
      await insertProfile(null);
      await intake().createAccount(USER, { ...loan, studentLoanPlan: "PLAN_2" } as never);
      expect(await storedPlans()).toBe("PLAN_2");
    });

    it("writes it to a profile that said no loan", async () => {
      await insertProfile("");
      await intake().createAccount(USER, { ...loan, studentLoanPlan: "PLAN_2" } as never);
      expect(await storedPlans()).toBe("PLAN_2");
    });

    it("leaves a profile plan the user saved alone", async () => {
      await insertProfile("PLAN_1");
      await intake().createAccount(USER, { ...loan, studentLoanPlan: "PLAN_2" } as never);
      expect(await storedPlans()).toBe("PLAN_1");
    });

    it("a plan added to an existing loan account on edit writes it too", async () => {
      await insertProfile(null);
      const created = await intake().createAccount(USER, loan as never);
      expect(await storedPlans()).toBeNull();
      await intake().updateAccount(USER, created.id, { studentLoanPlan: "PLAN_5" } as never);
      expect(await storedPlans()).toBe("PLAN_5");
    });

    it("with no profile row yet, the account is saved and no profile is invented", async () => {
      await intake().createAccount(USER, { ...loan, studentLoanPlan: "PLAN_2" } as never);
      const profiles = await ds.query("SELECT 1 FROM user_profiles WHERE user_id = $1", [USER]);
      expect(profiles).toHaveLength(0);
      const accounts = await ds.query<Array<{ student_loan_plan: string | null }>>(
        "SELECT student_loan_plan FROM accounts WHERE user_id = $1",
        [USER],
      );
      expect(at(accounts, 0).student_loan_plan).toBe("PLAN_2");
    });
  },
);
