import { Logger } from "@nestjs/common";
import type { MigrationInterface, QueryRunner } from "typeorm";
import { MIGRATION_LOCK_KEY } from "../config/migration-lock";

// Removes example data that older versions of the API wrote into real users' accounts on
// first read, plus every row owned by the retired shared mock identities. The owner
// decided (docs/audit DECISIONS.md) that production data is test data, so matching rows
// are deleted without per-row review. Take a database backup first: this is irreversible.
//
// Matching is by exact fingerprint only, so anything a user edited is kept.

// Identities the dev-mode auth fallbacks used to share. All their data is deleted.
export const MOCK_USER_IDS: readonly string[] = ["user_mock", "dev_user_123"];

// md5 of name|amount|date|frequency|category|source|end_date, formatted in SQL
// (to_char), never through the session DateStyle or a JS number. end_date is part of the
// fingerprint, so a seeded row whose range the user capped later is kept.
export const TAX_FINGERPRINT_SQL = `md5(
  "name" || '|' || to_char("amount", 'FM999999999990.00') || '|' || to_char("date", 'YYYY-MM-DD')
  || '|' || "frequency" || '|' || "category" || '|' || "source"
  || '|' || coalesce(to_char("end_date", 'YYYY-MM-DD'), '')
)`;

// 62 fingerprints precomputed once from the old tax seed list (last in
// apps/backend/src/tax.controller.ts at commit 11eccf8) and verified against the same
// expression run in Postgres. Hashes only: the original values are not reintroduced.
export const SEEDED_TAX_FINGERPRINTS: readonly string[] = [
  "e0e4a4aa50f1bfe3a904915788fe6571",
  "f7d234b44b8dcb1ba323095b3e5693fe",
  "2772aa47961556c225de30643aa1cf42",
  "4ed4bf285dbd027b17236b86ff744f47",
  "1f15c149e7edca489ce74a10d37f9623",
  "3668a13d9d85992ef755b945efc63a36",
  "25ed93d8cd6b12cb7c09f4437b575d00",
  "0cdb44cc4a3f223b2cfb121fdeeb5a36",
  "1c216fb5e02adb5daccc44e36581431f",
  "a5b87a844db3fba444d0c21471029c6b",
  "f052ab852325bd20068be48227d67272",
  "fd8a0adb856be3cfcafded925dd008ab",
  "4f84b6472501ecaaea56f3293b23ee9a",
  "529966c01204672428e780dbda904adc",
  "f85bced822b82d76790907834877df41",
  "6360d2ae03cc4dbc41ae7e943791bcbe",
  "881f831c43ad23faa0978f757b8b6254",
  "74c8a4102dbd8b2e41a77de6a4b30586",
  "2a5ebeb35dd11843fc6716c839464f1e",
  "7d4d1205594bb18843b1743cc8155405",
  "dfbd59452afeff4916fc9691a0c0e91c",
  "43749b0ab574e7b18c397f0e08e80d73",
  "d27b8ec5a7c5f1b6859cbc7171d585af",
  "d5b37909945d11250814cc4e01845eb0",
  "454b3bf8af12e2aee570b83db058412e",
  "836c0028554938c76d92b01dea0904f4",
  "b6869ba937dd08b34d4421640a81a468",
  "0539d75e99b4a9edf410602aee95cb09",
  "9acc5e2838bee245ec749cdc05d238d9",
  "6c2b938ecd62d5cd4c0626c6cf280f2c",
  "79fbfcd91e132d33bb9fcd77d51d54e8",
  "0321122c83185ba3f66979364dd0b2a7",
  "32fada8c06b1ce2dc11a8a1c6f7ff09a",
  "d22c2970bcf758bdb194bebba51b30d1",
  "1b35a101fa457ed8907a20f2d3faf264",
  "367b5102234965b822d8fd4bebe3f782",
  "363729803bdb81cd1631bae5e360c961",
  "da1cdd4aee498bbcff1cb81f4b8ff584",
  "70f43af9ab1068077531bbd29d37d7db",
  "d376879ad175813a8bad3f6762d1b3e2",
  "1979edd93746b31d8910bc3c68895b5e",
  "e19666a44a6a3eeb143b46992821758a",
  "25cfd07aeafc00943588cf518a26e126",
  "73a0af46a032d6d5315ca0b2ae3947fa",
  "3082158295eba8c25cdbfff545d98e4c",
  "f696b2597dc389a21ac6e130446af89c",
  "4618f35a43711c55a614ea9367c09b01",
  "3bf19fa033c77f474dc3f05c99150a2d",
  "4b25af9ed0dae7bb51eca00c809206e2",
  "1933b300ec9a5c56923b0413f76fd260",
  "7dadb4be7ba641f79d0068f002b01bf7",
  "f81b3f67e09c08feca6c561830efd298",
  "b1f016ce668c42123d2547927487eeaa",
  "6d83c6836d3c1ca44ed90762defbd055",
  "a6764e2d49c2d64c4bb1101f6c60b581",
  "eee50b10dc37f77ae89d2183ff3e383c",
  "cf8364b0010f6bbb34440c4cae533054",
  "a68d9d9b7d9d297e89358762b6ca3c7f",
  "0f7520f2ea17cad90596e45dd68f8e16",
  "d5d85eaa437fb4658a05aba196d6a4a0",
  "7e95dd1b18e3c27c0fc473446bcf614e",
  "447ddeda8e62627084c951fcedf34da1",
];

export interface SeededAccount {
  name: string;
  type: string;
  balance: number;
  interestRate: number | null;
  monthlyContribution: number | null;
  isCurrent: boolean;
}

// The four accounts the old account read created. is_current defaulted to true.
export const SEEDED_ACCOUNTS: readonly SeededAccount[] = [
  {
    name: "Main Checking",
    type: "Current",
    balance: 2450.75,
    interestRate: null,
    monthlyContribution: null,
    isCurrent: true,
  },
  {
    name: "High Yield Savings",
    type: "Saving",
    balance: 15800,
    interestRate: 4.5,
    monthlyContribution: 250,
    isCurrent: true,
  },
  {
    name: "Cash ISA — Trading 212",
    type: "Saving",
    balance: 42100.5,
    interestRate: 7,
    monthlyContribution: 300,
    isCurrent: true,
  },
  {
    name: "Workplace Pension — Nest",
    type: "Pension",
    balance: 18500,
    interestRate: 5.5,
    monthlyContribution: 433,
    isCurrent: true,
  },
];

export interface SeededBudgetEntry {
  category: string;
  name: string;
  amount: number;
  isIncome: boolean;
  isPrimaryIncome: boolean;
  isEssential: boolean;
}

// The budget template (all monthly, is_default true), including the Salary row that was
// later dropped from the template.
export const SEEDED_BUDGET_ENTRIES: readonly SeededBudgetEntry[] = [
  {
    category: "housing",
    name: "Rent / Mortgage",
    amount: 1200,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "housing",
    name: "Home Insurance",
    amount: 30,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "bills",
    name: "Electricity",
    amount: 80,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "bills",
    name: "Gas",
    amount: 60,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "bills",
    name: "Water",
    amount: 30,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "bills",
    name: "Council Tax",
    amount: 150,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "bills",
    name: "Broadband",
    amount: 40,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "expenses",
    name: "Mobile Phone",
    amount: 35,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "expenses",
    name: "Gym",
    amount: 40,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
  },
  {
    category: "expenses",
    name: "Netflix",
    amount: 18,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
  },
  {
    category: "expenses",
    name: "Spotify",
    amount: 11,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
  },
  {
    category: "expenses",
    name: "Car Insurance",
    amount: 60,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "savings",
    name: "Emergency Fund",
    amount: 200,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "savings",
    name: "ISA / Investments",
    amount: 300,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
  },
  {
    category: "income",
    name: "Salary (Take Home)",
    amount: 3000,
    isIncome: true,
    isPrimaryIncome: true,
    isEssential: true,
  },
];

// Runs a DELETE wrapped in a CTE so the affected-row count comes back as plain rows
// regardless of the driver's result shape.
const deleteCount = async (
  queryRunner: QueryRunner,
  deleteSql: string,
  params: unknown[] = [],
): Promise<number> => {
  const rows: { n: number }[] = await queryRunner.query(
    `WITH d AS (${deleteSql} RETURNING 1) SELECT count(*)::int AS n FROM d`,
    params,
  );
  return rows[0]?.n ?? 0;
};

export class RemoveSeededExampleData1794355400000 implements MigrationInterface {
  name = "RemoveSeededExampleData1794355400000";

  private readonly logger = new Logger("RemoveSeededExampleData");

  // TypeORM instantiates migrations without arguments. The parameter exists so tests can
  // supply fingerprints of generic rows.
  constructor(private readonly taxFingerprints: readonly string[] = SEEDED_TAX_FINGERPRINTS) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Same lock as the baseline: wait for any concurrent instance to commit, then
    // re-check whether it already recorded this migration (TypeORM's pending list was
    // computed before the transaction began).
    await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);

    const tableName = queryRunner.connection.options.migrationsTableName ?? "migrations";
    if (await queryRunner.hasTable(tableName)) {
      const escaped = queryRunner.connection.driver.escape(tableName);
      const recorded: unknown[] = await queryRunner.query(
        `SELECT 1 FROM ${escaped} WHERE "name" = $1`,
        [this.name],
      );
      if (recorded.length > 0) return;
    }

    const taxRecords = await deleteCount(
      queryRunner,
      `DELETE FROM "tax_records" WHERE ${TAX_FINGERPRINT_SQL} = ANY($1::text[])`,
      [this.taxFingerprints],
    );

    // Exact seed tuple, not linked to a bank connection, and nothing hangs off it.
    const accounts = await deleteCount(
      queryRunner,
      `DELETE FROM "accounts" a USING jsonb_to_recordset($1::jsonb) AS s(
           "name" text, "type" text, "balance" numeric, "interestRate" numeric,
           "monthlyContribution" numeric, "isCurrent" boolean)
         WHERE a."name" = s."name" AND a."type" = s."type" AND a."balance" = s."balance"
           AND a."interest_rate" IS NOT DISTINCT FROM s."interestRate"
           AND a."monthly_contribution" IS NOT DISTINCT FROM s."monthlyContribution"
           AND a."is_current" IS NOT DISTINCT FROM s."isCurrent"
           AND a."currency" = 'GBP'
           AND a."connection_id" IS NULL AND a."external_account_id" IS NULL
           AND NOT EXISTS (SELECT 1 FROM "account_details" d WHERE d."account_id"::text = a."id"::text)
           AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."account_id"::text = a."id"::text)`,
      [JSON.stringify(SEEDED_ACCOUNTS)],
    );

    // Template rows the user never touched (updated_at still equals created_at).
    const budgetEntries = await deleteCount(
      queryRunner,
      `DELETE FROM "budget_entries" b USING jsonb_to_recordset($1::jsonb) AS s(
           "category" text, "name" text, "amount" numeric, "isIncome" boolean,
           "isPrimaryIncome" boolean, "isEssential" boolean)
         WHERE b."is_default" = true AND b."category" = s."category" AND b."name" = s."name"
           AND b."amount" = s."amount" AND b."frequency" = 'monthly'
           AND b."is_income" = s."isIncome" AND b."is_primary_income" = s."isPrimaryIncome"
           AND b."is_essential" = s."isEssential" AND b."notes" IS NULL
           AND b."updated_at" = b."created_at"`,
      [JSON.stringify(SEEDED_BUDGET_ENTRIES)],
    );

    // Everything owned by the retired mock identities, in every user-owned table.
    // There are no foreign keys; account_details hangs off accounts by id, so it goes first.
    const mock = [...MOCK_USER_IDS];
    const mockDetails = await deleteCount(
      queryRunner,
      `DELETE FROM "account_details" WHERE "account_id"::text IN
         (SELECT "id"::text FROM "accounts" WHERE "user_id" = ANY($1::text[]))`,
      [mock],
    );
    let mockRows = mockDetails;
    for (const table of [
      "transactions",
      "accounts",
      "bank_connections",
      "budget_entries",
      "mcp_tokens",
      "tax_records",
      "user_profiles",
    ]) {
      mockRows += await deleteCount(
        queryRunner,
        `DELETE FROM "${table}" WHERE "user_id" = ANY($1::text[])`,
        [mock],
      );
    }

    // Counts only: never ids, names or amounts.
    this.logger.log(
      `Removed seeded example data: taxRecords=${taxRecords} accounts=${accounts} budgetEntries=${budgetEntries} mockIdentityRows=${mockRows}`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally a no-op: the deleted rows cannot be recovered. Restore from the
    // backup taken before deploy.
  }
}
