// Support for migration AccountIdForeignKeys1794358200000 (BE-08, audit M2) and its read-only
// report script. It lives outside src/migrations because TypeORM loads every exported function in
// that folder as a migration.
//
// `account_details.account_id` and `transactions.account_id` were `varchar` against the `uuid` key
// `accounts.id`, with no foreign key. A child row is an orphan when no account with that id
// belongs to the row's own user: every read reaches history through the user's accounts, so such
// a row is unreachable (or, for another user's account, must never become reachable).

/** The tables whose `account_id` the migration converts to `uuid` and keys to `accounts(id)`. */
export const ACCOUNT_CHILD_TABLES = [
  { table: "account_details", foreignKey: "FK_account_details_account" },
  { table: "transactions", foreignKey: "FK_transactions_account" },
] as const;

type AccountChildTable = (typeof ACCOUNT_CHILD_TABLES)[number]["table"];

/** Matches a uuid in any case; only such a value can name an account. */
const UUID_PATTERN_SQL = "'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'";

/**
 * `account_id` as a uuid, or NULL when it is not one. Works whether the column is still `varchar`
 * or already `uuid` (a synchronize-built database), and never casts a non-uuid (which would throw).
 */
const accountIdAsUuid = (alias: string): string =>
  `(CASE WHEN ${alias}."account_id"::text ~* ${UUID_PATTERN_SQL} THEN ${alias}."account_id"::text::uuid END)`;

/** True for a row of `alias` that names no account of its own user. Used by count and delete. */
export const orphanPredicate = (alias: string): string =>
  `NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a."id" = ${accountIdAsUuid(alias)} AND a."user_id" = ${alias}."user_id")`;

/** Orphan rows of one table, split by why they are orphans. Counts only, never ids. */
export interface AccountOrphanCounts {
  table: AccountChildTable;
  /** `account_id` is not a uuid at all. */
  notUuid: number;
  /** A uuid, but no account has it. */
  missingAccount: number;
  /** The account exists but belongs to a different user than the row. */
  otherUsersAccount: number;
}

interface SqlRunner {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

/** Read-only: orphan counts per table. Shared by the migration log and the report script. */
export async function countAccountOrphans(runner: SqlRunner): Promise<AccountOrphanCounts[]> {
  const result: AccountOrphanCounts[] = [];
  for (const { table } of ACCOUNT_CHILD_TABLES) {
    const [row] = (await runner.query(
      `SELECT
         count(*) FILTER (WHERE c."account_id"::text !~* ${UUID_PATTERN_SQL})::int AS "notUuid",
         count(*) FILTER (WHERE c."account_id"::text ~* ${UUID_PATTERN_SQL}
           AND NOT EXISTS (SELECT 1 FROM "accounts" a WHERE a."id" = ${accountIdAsUuid("c")}))::int
           AS "missingAccount",
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "accounts" a
           WHERE a."id" = ${accountIdAsUuid("c")} AND a."user_id" <> c."user_id"))::int
           AS "otherUsersAccount"
       FROM "${table}" c`,
    )) as Array<Partial<Record<keyof Omit<AccountOrphanCounts, "table">, unknown>>>;
    result.push({
      table,
      notUuid: Number(row?.notUuid ?? 0),
      missingAccount: Number(row?.missingAccount ?? 0),
      otherUsersAccount: Number(row?.otherUsersAccount ?? 0),
    });
  }
  return result;
}

export const totalOrphans = (counts: AccountOrphanCounts[]): number =>
  counts.reduce((sum, c) => sum + c.notUuid + c.missingAccount + c.otherUsersAccount, 0);

/** One line per table, for logs and the report script. */
export function describeAccountOrphans(counts: AccountOrphanCounts[]): string {
  return counts
    .map(
      (c) =>
        `  ${c.table}: ${c.notUuid} not a uuid, ${c.missingAccount} account missing, ` +
        `${c.otherUsersAccount} another user's account`,
    )
    .join("\n");
}
