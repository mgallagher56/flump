import { type DataSource, type FindManyOptions, In, type ObjectLiteral } from "typeorm";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { BudgetEntry } from "../entities/budget-entry.entity";
import { McpToken } from "../entities/mcp-token.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { Transaction } from "../entities/transaction.entity";

// The hot query shapes from the backend audit's EXPLAIN table (H7), shared by the plan test
// (src/migrations/query-plans.integration.spec.ts) and the PR's before/after EXPLAIN evidence.
// Repository queries are built through TypeORM's own find options, so the SQL is what the services
// really send; the raw ones are copied from imports.service.ts and finance.service.ts.

export interface SeedScale {
  users: number;
  accountsPerUser: number;
  transactionsPerAccount: number;
  monthsPerAccount: number;
  taxRecordsPerUser: number;
  budgetEntriesPerUser: number;
  connectionsPerUser: number;
  tokensPerUser: number;
}

/** The audit's seeded size: 2,000 users, 20k accounts, 200k transactions, 480k snapshot rows. */
export const AUDIT_SCALE: SeedScale = {
  users: 2_000,
  accountsPerUser: 10,
  transactionsPerAccount: 10,
  monthsPerAccount: 24,
  taxRecordsPerUser: 20,
  budgetEntriesPerUser: 20,
  connectionsPerUser: 2,
  tokensPerUser: 2,
};

export const userIdFor = (n: number): string => `user_${String(n).padStart(5, "0")}`;

/** Fills an empty, migrated schema with synthetic rows for `scale.users` users, then ANALYZEs. */
export async function seedHotQueryData(ds: DataSource, scale: SeedScale): Promise<void> {
  const users = `SELECT u, 'user_' || lpad(u::text, 5, '0') AS user_id FROM generate_series(1, ${scale.users}) u`;
  await ds.query(
    `INSERT INTO accounts (user_id, name, type, balance, currency, created_at)
     SELECT us.user_id, 'Account ' || a, 'Current Account', 100, 'GBP', now() - (a || ' days')::interval
     FROM (${users}) us, generate_series(1, ${scale.accountsPerUser}) a`,
  );
  await ds.query(
    `INSERT INTO transactions (account_id, user_id, amount, description, category, "timestamp")
     SELECT acc.id::text, acc.user_id, 12.34, 'Shop', 'Groceries', now() - (t || ' hours')::interval
     FROM accounts acc, generate_series(1, ${scale.transactionsPerAccount}) t`,
  );
  await ds.query(
    `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date)
     SELECT acc.id::text, acc.user_id, extract(year FROM d)::int, extract(month FROM d)::int, 100, d::date
     FROM accounts acc,
          generate_series(date '2024-01-01', date '2024-01-01' + ((${scale.monthsPerAccount} - 1) || ' months')::interval, interval '1 month') d`,
  );
  await ds.query(
    `INSERT INTO tax_records (user_id, type, source, category, name, amount, date)
     SELECT us.user_id, 'income', 'employment', 'salary', 'Pay ' || r, 1000, date '2025-04-06' + r
     FROM (${users}) us, generate_series(1, ${scale.taxRecordsPerUser}) r`,
  );
  await ds.query(
    `INSERT INTO budget_entries (user_id, category, name, amount)
     SELECT us.user_id, 'Housing', 'Entry ' || b, 50
     FROM (${users}) us, generate_series(1, ${scale.budgetEntriesPerUser}) b`,
  );
  await ds.query(
    `INSERT INTO bank_connections (user_id, institution_id, institution_name)
     SELECT us.user_id, 'inst', 'Bank'
     FROM (${users}) us, generate_series(1, ${scale.connectionsPerUser}) c`,
  );
  await ds.query(
    `INSERT INTO mcp_tokens (user_id, name, token_hash, token_prefix)
     SELECT us.user_id, 'Token', md5(us.user_id || '-' || k), 'flmp_'
     FROM (${users}) us, generate_series(1, ${scale.tokensPerUser}) k`,
  );
  await ds.query("ANALYZE");
}

export interface HotQuery {
  name: string;
  /** The table that must not be scanned sequentially. */
  table: string;
  /** The index the plan is expected to use on that table. */
  index: string;
  build: (ds: DataSource, userId: string, accountId: string) => [string, unknown[]];
}

function fromFind<T extends ObjectLiteral>(
  ds: DataSource,
  entity: new () => T,
  options: FindManyOptions<T>,
): [string, unknown[]] {
  return ds
    .getRepository(entity)
    .createQueryBuilder()
    .setFindOptions(options)
    .getQueryAndParameters();
}

export const HOT_QUERIES: HotQuery[] = [
  {
    name: "Transactions by user, newest first",
    table: "transactions",
    index: "IDX_transactions_user_timestamp",
    build: (ds, userId) =>
      fromFind(ds, Transaction, { where: { userId }, order: { timestamp: "DESC" } }),
  },
  {
    name: "Transactions by account",
    table: "transactions",
    index: "IDX_transactions_account",
    build: (ds, userId, accountId) =>
      fromFind(ds, Transaction, { where: { userId, accountId }, order: { timestamp: "DESC" } }),
  },
  {
    name: "Accounts by user (every page)",
    table: "accounts",
    index: "IDX_accounts_user_created",
    build: (ds, userId) =>
      fromFind(ds, Account, { where: { userId }, order: { createdAt: "ASC" } }),
  },
  {
    name: "Monthly details for a user's accounts",
    table: "accounts",
    index: "IDX_accounts_user_created",
    // getAccounts runs this after the accounts query; the sub-select stands in for its id list.
    build: (ds, userId) => {
      const [sql, params] = fromFind(ds, AccountDetail, {
        where: { accountId: In(["__ids__"]) },
        order: { year: "ASC", month: "ASC" },
      });
      return [
        sql.replace(
          /IN \(\$1\)/,
          `IN (SELECT a."id"::text FROM "accounts" a WHERE a."user_id" = $1)`,
        ),
        [userId, ...params.slice(1)],
      ];
    },
  },
  {
    name: "Tax records by user, newest first",
    table: "tax_records",
    index: "IDX_tax_records_user_date",
    build: (ds, userId) => fromFind(ds, TaxRecord, { where: { userId }, order: { date: "DESC" } }),
  },
  {
    name: "Budget entries by user",
    table: "budget_entries",
    index: "IDX_budget_entries_user_created",
    build: (ds, userId) =>
      fromFind(ds, BudgetEntry, { where: { userId }, order: { createdAt: "ASC" } }),
  },
  {
    name: "Bank connections by user, newest first",
    table: "bank_connections",
    index: "IDX_bank_connections_user_created",
    build: (ds, userId) =>
      fromFind(ds, BankConnection, { where: { userId }, order: { createdAt: "DESC" } }),
  },
  {
    name: "MCP tokens by user, newest first",
    table: "mcp_tokens",
    index: "IDX_mcp_tokens_user_created",
    build: (ds, userId) =>
      fromFind(ds, McpToken, { where: { userId }, order: { createdAt: "DESC" } }),
  },
  {
    name: "Import revert NOT EXISTS on transactions",
    table: "transactions",
    index: "IDX_transactions_account",
    build: (_ds, userId, accountId) => [
      `SELECT a."id" FROM "accounts" a
       WHERE a."id" = ANY($1::uuid[]) AND a."user_id" = $2 AND a."connection_id" IS NULL
         AND NOT EXISTS (SELECT 1 FROM "account_details" d WHERE d."account_id" = a."id"::text)
         AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."account_id" = a."id"::text)`,
      [[accountId], userId],
    ],
  },
  {
    name: "Delete one account's transactions",
    table: "transactions",
    index: "IDX_transactions_account",
    build: (_ds, _userId, accountId) => [
      `DELETE FROM "transactions" WHERE "account_id" = $1`,
      [accountId],
    ],
  },
];

export interface PlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Index Name"?: string;
  Plans?: PlanNode[];
}

/** Every node of an EXPLAIN (FORMAT JSON) plan, depth first. */
export function planNodes(node: PlanNode): PlanNode[] {
  return [node, ...(node.Plans ?? []).flatMap(planNodes)];
}

/** Runs EXPLAIN (FORMAT JSON) on one hot query. `analyze` executes it (inside a rolled-back
 *  transaction, so a DELETE changes nothing). */
export async function explainHotQuery(
  ds: DataSource,
  query: HotQuery,
  userId: string,
  accountId: string,
  analyze = false,
): Promise<{ plan: PlanNode; executionMs?: number }> {
  const [sql, params] = query.build(ds, userId, accountId);
  const runner = ds.createQueryRunner();
  try {
    await runner.startTransaction();
    const rows: { "QUERY PLAN": [{ Plan: PlanNode; "Execution Time"?: number }] }[] =
      await runner.query(
        `EXPLAIN (FORMAT JSON${analyze ? ", ANALYZE, BUFFERS" : ""}) ${sql}`,
        params,
      );
    const [result] = rows[0]["QUERY PLAN"];
    return { plan: result.Plan, executionMs: result["Execution Time"] };
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
  }
}
