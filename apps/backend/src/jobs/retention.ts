/**
 * Retention policies and the purge that applies them (BE-06; findings H12, M-PRIV2; rulings D4
 * and D5). Run daily by a Railway cron service (`retention-purge.ts`), never in the API process.
 *
 * Every policy is a DELETE of rows past a cutoff computed from one `now`, done in batches so no
 * statement holds locks for long. Running it twice, or two runs at once, is safe: a second pass
 * finds nothing to delete, and an advisory lock makes an overlapping run skip.
 */

import { IDEMPOTENCY_KEY_TTL_HOURS } from "@flump/api-contract";

/** Anything that runs a parameterised query (a TypeORM DataSource or QueryRunner, a pg client). */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface RetentionPolicy {
  /** Short name used in the log line. */
  name: string;
  table: string;
  /** SQL condition on the table's rows; `$1` is the run's `now` (timestamptz). */
  where: string;
  /** Why the rows go at that point, for the data map and reviewers. */
  reason: string;
}

/** Ruling D4: audit records 13 months, import batches 30 days, inactive accounts 24 months. */
export const RETENTION_POLICIES: readonly RetentionPolicy[] = [
  {
    name: "audit_events",
    table: "audit_events",
    where: `"created_at" < $1::timestamptz - interval '13 months'`,
    reason: "audit records are kept 13 months (D4)",
  },
  {
    name: "agent_audit_events",
    table: "agent_audit_events",
    where: `"created_at" < $1::timestamptz - interval '13 months'`,
    reason: "AI connection activity is an audit record, kept 13 months (D4)",
  },
  {
    name: "import_batches",
    table: "import_batches",
    // Staged batches expire after 7 days, so every batch this old is closed. Imported history keeps
    // its values: account_details.import_batch_id is ON DELETE SET NULL. Undo ends with the batch.
    where: `"updated_at" < $1::timestamptz - interval '30 days'`,
    reason: "import batches are kept 30 days after their last change (D4)",
  },
  {
    name: "mcp_tokens_closed",
    table: "mcp_tokens",
    // Revoked or expired 13 months ago: every audit row of the token has gone by then as well.
    where: `("revoked_at" < $1::timestamptz - interval '13 months'
             OR "expires_at" < $1::timestamptz - interval '13 months')`,
    reason: "a revoked or expired AI token is kept as long as its audit rows (13 months)",
  },
  {
    name: "bank_oauth_states",
    table: "bank_oauth_states",
    where: `"expires_at" < $1::timestamptz - interval '1 day'`,
    reason: "a pending bank consent is single-use and lives ten minutes; a day's grace for support",
  },
  {
    name: "idempotency_keys",
    table: "idempotency_keys",
    // The interceptor already treats these as unused and deletes them for the user it serves; this
    // sweeps users who never come back (BE-09).
    where: `"created_at" < $1::timestamptz - interval '${Number(IDEMPOTENCY_KEY_TTL_HOURS)} hours'`,
    reason: "a stored create response is only replayable for its TTL; after that it is dead weight",
  },
  {
    name: "account_deletion_tombstones",
    table: "account_deletion_tombstones",
    where: `"expires_at" < $1::timestamptz`,
    reason: "deletion proofs are kept 24 months (D1); expires_at is set at deletion",
  },
  {
    name: "liability_sign_backfill",
    table: "liability_sign_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "BE-05 before-image, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
];

/** Profiles with no authenticated request for this long are due for erasure (D4). */
const INACTIVE_ACCOUNT_WHERE = `"last_active_at" < $1::timestamptz - interval '24 months'`;

const RETENTION_BATCH_SIZE = 5000;
/** pg advisory lock key for the purge ("BE06" in ASCII), so overlapping runs skip. */
export const RETENTION_LOCK_KEY = 0x42453036;

export interface RetentionReport {
  skipped: boolean;
  deleted: Record<string, number>;
  /** Accounts past 24 months of inactivity. Reported, not erased: see the PR notes and runbook. */
  inactiveAccountsDue: number;
}

const rowsOf = (result: unknown): Array<Record<string, unknown>> =>
  Array.isArray(result) && Array.isArray(result[0])
    ? (result[0] as Array<Record<string, unknown>>)
    : Array.isArray(result)
      ? (result as Array<Record<string, unknown>>)
      : [];

async function tableExists(db: Queryable, table: string): Promise<boolean> {
  const [row] = rowsOf(await db.query("SELECT to_regclass($1) AS t", [`public.${table}`]));
  return Boolean(row?.t);
}

async function purgeTable(db: Queryable, policy: RetentionPolicy, now: Date): Promise<number> {
  let total = 0;
  for (;;) {
    const rows = rowsOf(
      await db.query(
        `WITH doomed AS (
           SELECT ctid FROM "${policy.table}" WHERE ${policy.where} LIMIT ${RETENTION_BATCH_SIZE}
         )
         DELETE FROM "${policy.table}" WHERE ctid IN (SELECT ctid FROM doomed) RETURNING 1`,
        [now],
      ),
    );
    total += rows.length;
    if (rows.length < RETENTION_BATCH_SIZE) return total;
  }
}

/**
 * Applies every policy once. `db` must be a single connection (a QueryRunner or a pg client) so the
 * session advisory lock and the deletes share it.
 */
export async function runRetentionPurge(
  db: Queryable,
  now: Date = new Date(),
  policies: readonly RetentionPolicy[] = RETENTION_POLICIES,
): Promise<RetentionReport> {
  const [lock] = rowsOf(
    await db.query("SELECT pg_try_advisory_lock($1) AS locked", [RETENTION_LOCK_KEY]),
  );
  if (!lock?.locked) return { skipped: true, deleted: {}, inactiveAccountsDue: 0 };
  try {
    const deleted: Record<string, number> = {};
    for (const policy of policies) {
      deleted[policy.name] = (await tableExists(db, policy.table))
        ? await purgeTable(db, policy, now)
        : 0;
    }
    const [due] = rowsOf(
      await db.query(
        `SELECT count(*)::int AS n FROM "user_profiles" WHERE ${INACTIVE_ACCOUNT_WHERE}`,
        [now],
      ),
    );
    return { skipped: false, deleted, inactiveAccountsDue: Number(due?.n ?? 0) };
  } finally {
    await db.query("SELECT pg_advisory_unlock($1)", [RETENTION_LOCK_KEY]);
  }
}

/** One line per policy plus the inactive count: names and counts only, never ids. */
export function describeRetentionReport(report: RetentionReport): string[] {
  if (report.skipped) return ["retention skipped: another run holds the lock"];
  return [
    ...Object.entries(report.deleted).map(([name, n]) => `retention ${name} deleted=${n}`),
    `retention inactive_accounts_due=${report.inactiveAccountsDue}`,
  ];
}
