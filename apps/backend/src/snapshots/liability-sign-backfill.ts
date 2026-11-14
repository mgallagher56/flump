// Support for migration LiabilitySignRule1794358050000 (BE-05) and its dry run. It lives outside
// src/migrations because TypeORM loads every exported function in that folder as a migration.
//
// The type list is frozen here on purpose: a migration must keep meaning what it meant. It must
// equal STORED_NEGATIVE_ACCOUNT_TYPES in packages/banking (liability-sign-backfill.spec.ts checks);
// adding a type there needs a new migration that re-signs those rows and replaces the checks.
export const LIABILITY_TYPES_AT_MIGRATION = [
  "Mortgage",
  "Credit Card",
  "Loan",
  "Overdraft",
  "Student Loan",
] as const;

/** The list as a SQL literal list, for IN (...). The values are constants, never user input. */
export const LIABILITY_TYPES_SQL = LIABILITY_TYPES_AT_MIGRATION.map((t) => `'${t}'`).join(", ");
const TYPES_SQL = LIABILITY_TYPES_SQL;
export const ACCOUNTS_CHECK = "CHK_accounts_liability_balance_non_positive";
export const BEFORE_IMAGE_TABLE = "liability_sign_backfill";
export const DETAIL_TRIGGER = "TRG_account_details_liability_sign";
export const TYPE_TRIGGER = "TRG_accounts_liability_type_change";

/** Rows the backfill would change (or did), per table and account type. Counts only. */
export interface LiabilitySignPlan {
  accounts: Array<{ type: string; rows: number }>;
  accountDetails: Array<{ type: string; rows: number }>;
  /** Distinct owners with at least one row to change. */
  users: number;
}

interface SqlRunner {
  query(sql: string, params?: unknown[]): Promise<any>;
}

/** Read-only: what the backfill would change. Shared by the migration log and the dry run. */
// Both sides compare as text so the plan reads the same before and after
// AccountIdForeignKeys1794358200000 turns account_details.account_id into a uuid.
export async function planLiabilitySignBackfill(runner: SqlRunner): Promise<LiabilitySignPlan> {
  const accounts: Array<{ type: string; rows: number }> = await runner.query(
    `SELECT "type", count(*)::int AS "rows" FROM "accounts"
     WHERE "type" IN (${TYPES_SQL}) AND "balance" > 0
     GROUP BY "type" ORDER BY "type"`,
  );
  const accountDetails: Array<{ type: string; rows: number }> = await runner.query(
    `SELECT a."type", count(*)::int AS "rows"
     FROM "account_details" d JOIN "accounts" a ON a."id"::text = d."account_id"::text
     WHERE a."type" IN (${TYPES_SQL}) AND d."value" > 0
     GROUP BY a."type" ORDER BY a."type"`,
  );
  const [owners]: Array<{ users: number }> = await runner.query(
    `SELECT count(DISTINCT a."user_id")::int AS "users"
     FROM "accounts" a
     WHERE a."type" IN (${TYPES_SQL})
       AND (a."balance" > 0 OR EXISTS (
         SELECT 1 FROM "account_details" d WHERE d."account_id"::text = a."id"::text AND d."value" > 0))`,
  );
  return { accounts, accountDetails, users: owners?.users ?? 0 };
}

/** One line per non-zero count, for the migration log and the dry run. */
export function describeLiabilitySignPlan(plan: LiabilitySignPlan): string {
  const total = (rows: Array<{ rows: number }>) => rows.reduce((n, r) => n + r.rows, 0);
  const lines = [
    `accounts: ${total(plan.accounts)} row(s)`,
    ...plan.accounts.map((r) => `  ${r.type}: ${r.rows}`),
    `account_details: ${total(plan.accountDetails)} row(s)`,
    ...plan.accountDetails.map((r) => `  ${r.type}: ${r.rows}`),
    `users affected: ${plan.users}`,
  ];
  return lines.join("\n");
}
