/**
 * Retention policies and the purge that applies them (BE-06; findings H12, M-PRIV2; rulings D4
 * and D5 as revised on 25 Nov 2026). The backend runs it itself, daily and shortly after boot
 * (`retention.scheduler.ts`); `retention-purge.ts` is the same purge as a command, for the optional
 * Railway cron service (`apps/backend/retention.railway.json`).
 *
 * Every policy is a DELETE (or, for `clear` policies, an UPDATE that blanks data) of rows past a
 * cutoff computed from one `now`, done in batches so no statement holds locks for long. Running it
 * twice, or two runs at once from any number of instances or triggers, is safe: a second pass finds
 * nothing to do, and a session advisory lock makes an overlapping run skip. Each completed run
 * writes the one-row `retention_runs` record (counts only).
 */

import { IDEMPOTENCY_KEY_TTL_HOURS } from "@flump/api-contract";
import { allowAuditDelete } from "../audit/audit-delete-guard";

/**
 * One dedicated connection that runs a parameterised query: a TypeORM QueryRunner or a pg client.
 * Never a pool or a DataSource: the advisory lock and the `audit_events` batch transaction
 * (BEGIN, the delete reason, the delete, COMMIT) must all run on the same connection.
 */
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
  /**
   * True for `audit_events` only (SEC-F): the table refuses a DELETE unless the transaction has
   * declared the `retention` reason, so each batch runs in its own transaction that sets it.
   */
  guardedAuditDelete?: boolean;
  /**
   * When set, matching rows are not deleted: this SET clause blanks the data instead, and must
   * make the row stop matching `where` (so the batch loop ends). `$1` is the run's `now`.
   */
  clear?: string;
}

/** Ruling D4: audit records 13 months, import batches 30 days, inactive accounts 24 months. */
export const RETENTION_POLICIES: readonly RetentionPolicy[] = [
  {
    name: "audit_events",
    table: "audit_events",
    where: `"created_at" < $1::timestamptz - interval '13 months'`,
    reason: "audit records are kept 13 months (D4)",
    guardedAuditDelete: true,
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
    name: "import_batches_staged_expired",
    table: "import_batches",
    // The web app says imports not confirmed within 7 days are cleared. The imports service does
    // this lazily for the user it serves (`expireStale` in modules/imports/import-helpers.ts); this
    // does the same, with the same SQL, for users who never come back. The cleared batch then goes
    // 30 days after this change, by the policy above.
    where: `"status" = 'staged' AND "expires_at" <= $1::timestamptz`,
    clear: `"status" = 'expired', "updated_at" = $1::timestamptz,
            "payload" = jsonb_set(jsonb_set("payload", '{accounts}', '[]'), '{balances}', '[]')`,
    reason:
      "an import not confirmed within 7 days is cleared: its staged names and values are dropped (D4, imports copy)",
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
    // Before beta_invites: an invite goes once no member row points at it.
    name: "beta_members_removed",
    table: "beta_members",
    where: `"removed_at" < $1::timestamptz - interval '30 days'`,
    reason:
      "a member removed from the invite-only beta is kept 30 days (so a removal can be checked and undone with a new link), then deleted",
  },
  {
    name: "beta_invites_closed",
    table: "beta_invites",
    // Closed = cancelled, used or expired, whichever applies. A used invite stays while a member
    // row (active, or removed under 30 days) still points at it, for the admin's member list.
    where: `COALESCE("revoked_at", "redeemed_at", "expires_at") < $1::timestamptz - interval '30 days'
            AND NOT EXISTS (
              SELECT 1 FROM "beta_members" m WHERE m."invite_id" = "beta_invites"."id"
            )`,
    reason:
      "an invite link is kept 30 days after it was cancelled, used or expired (the admin's list shows that long), and a used one while its member row exists",
  },
  {
    name: "household_invitations_expired",
    table: "household_invitations",
    // An expired link can never be used (accept and preview check expires_at), so it goes at once.
    where: `"expires_at" < $1::timestamptz`,
    reason:
      "a household invitation link works for 48 hours; once expired it is unusable and is deleted (E34 C3, G4)",
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
  {
    name: "pension_rates_backfill",
    table: "pension_rates_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "slice 6 migration before-image, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "student_loan_plan_backfill",
    table: "student_loan_plan_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "slice 6 migration before-image, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "paye_salary_record_backfill",
    table: "paye_salary_record_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "slice 6 migration before-image, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "account_home_backfill",
    table: "account_home_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "system audit slice 4 before-image, kept 90 days so its migrations can be rolled back; after that their down() undoes nothing",
  },
  {
    name: "mortgage_repayment_type_backfill",
    table: "mortgage_repayment_type_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "before-image of the repayment types copied to sole residential mortgages, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "take_home_salary_backfill",
    table: "take_home_salary_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "before-image of the salaries cleared because the old onboarding wrote them as take-home x 12, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "reset_pension_zeros_backfill",
    table: "reset_pension_zeros_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "before-image of the pension zeros the old financial data reset wrote, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "rent_share_backfill",
    table: "rent_share_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "system audit slice 5 before-image, kept 90 days so its migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "profile_column_drop_backfill",
    table: "profile_column_drop_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '30 days'`,
    reason:
      "system audit slice 9 column-drop before-image, kept 30 days (the plan's rollback window); after that each drop's down() re-adds its column with the default only",
  },
  {
    name: "rental_share_onto_property_backfill",
    table: "rental_share_onto_property_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "system audit slice 7 before-image, kept 90 days so its migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "budget_entry_share_backfill",
    table: "budget_entry_share_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "E34 C1 one-home share before-image, kept 90 days so its migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "invoice_tax_record_category_backfill",
    table: "invoice_tax_record_category_backfill",
    where: `"backfilled_at" < $1::timestamptz - interval '90 days'`,
    reason:
      "before-image of the invoice-linked tax records moved to self-employed income, kept 90 days so the migration can be rolled back; after that its down() restores nothing",
  },
  {
    name: "rate_limit_buckets_expired",
    table: "rate_limit_buckets",
    // The store also sweeps expired rows every SWEEP_EVERY hits per process, which on low traffic
    // may not come for a while. The schedule runs this policy on every check (retention.scheduler).
    // The store reads the database clock (now()); the run's `now` is the app's. The earlier of the
    // two is used, so a clock running ahead on either side can never remove a live window.
    where: `"expires_at" < LEAST($1::timestamptz, now())`,
    reason:
      "a request counter is worth nothing once its window (a day at most) has passed; the privacy notice says one day at most",
  },
];

/** Name of the request counter policy, which the schedule also runs between daily purges. */
export const COUNTER_POLICY_NAME = "rate_limit_buckets_expired";

/** Profiles with no authenticated request for this long are due for erasure (D4). */
const INACTIVE_ACCOUNT_WHERE = `"last_active_at" < $1::timestamptz - interval '24 months'`;

const RETENTION_BATCH_SIZE = 5000;
/** pg advisory lock key for the purge ("BE06" in ASCII), so overlapping runs skip. */
export const RETENTION_LOCK_KEY = 0x42453036;

type RetentionTrigger = "schedule" | "command";

export interface RetentionRunOptions {
  /** Who started the run, written to the last-run record. */
  trigger?: RetentionTrigger;
  /**
   * Skip (reason "recent") when the last successful run is younger than this. Checked after the
   * lock is taken, so two instances that both found a run due never run back to back.
   */
  skipIfSucceededWithinMs?: number;
}

export interface RetentionReport {
  skipped: boolean;
  /** Why a run skipped: another run holds the lock, or a run succeeded recently. */
  skipReason?: "locked" | "recent";
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

async function deleteBatch(db: Queryable, policy: RetentionPolicy, now: Date): Promise<number> {
  const action = policy.clear
    ? `UPDATE "${policy.table}" SET ${policy.clear}`
    : `DELETE FROM "${policy.table}"`;
  return rowsOf(
    await db.query(
      `WITH doomed AS (
         SELECT ctid FROM "${policy.table}" WHERE ${policy.where} LIMIT ${RETENTION_BATCH_SIZE}
       )
       ${action} WHERE ctid IN (SELECT ctid FROM doomed) RETURNING 1`,
      [now],
    ),
  ).length;
}

/**
 * One batch of `audit_events` in its own transaction, which declares the `retention` reason the
 * table's delete guard asks for (SEC-F). The reason is transaction-local, so it is gone at COMMIT.
 */
async function deleteAuditBatch(
  db: Queryable,
  policy: RetentionPolicy,
  now: Date,
): Promise<number> {
  await db.query("BEGIN");
  try {
    await allowAuditDelete(db, "retention");
    const deleted = await deleteBatch(db, policy, now);
    await db.query("COMMIT");
    return deleted;
  } catch (error) {
    // A failed ROLLBACK (a dead connection) must not hide the error that caused it.
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

export async function purgeTable(
  db: Queryable,
  policy: RetentionPolicy,
  now: Date,
): Promise<number> {
  const batch = policy.guardedAuditDelete ? deleteAuditBatch : deleteBatch;
  let total = 0;
  for (;;) {
    const deleted = await batch(db, policy, now);
    total += deleted;
    if (deleted < RETENTION_BATCH_SIZE) return total;
  }
}

const RUNS_TABLE = "retention_runs";

/** When the last complete run finished, or null when none has (or the table is missing). */
export async function readLastRetentionSuccess(db: Queryable): Promise<Date | null> {
  if (!(await tableExists(db, RUNS_TABLE))) return null;
  const [row] = rowsOf(
    await db.query(`SELECT "last_success_at" AS at FROM "${RUNS_TABLE}" WHERE "id" = 1`),
  );
  const at = row?.at;
  if (at instanceof Date) return at;
  return typeof at === "string" ? new Date(at) : null;
}

async function recordSuccess(
  db: Queryable,
  now: Date,
  trigger: RetentionTrigger,
  deleted: Record<string, number>,
  inactiveAccountsDue: number,
): Promise<void> {
  if (!(await tableExists(db, RUNS_TABLE))) return;
  await db.query(
    `INSERT INTO "${RUNS_TABLE}"
       ("id", "last_attempt_at", "last_outcome", "last_trigger", "last_success_at", "last_deleted", "inactive_accounts_due")
     VALUES (1, $1, 'ok', $2, $1, $3::jsonb, $4)
     ON CONFLICT ("id") DO UPDATE SET
       "last_attempt_at" = EXCLUDED."last_attempt_at", "last_outcome" = 'ok',
       "last_trigger" = EXCLUDED."last_trigger", "last_success_at" = EXCLUDED."last_success_at",
       "last_deleted" = EXCLUDED."last_deleted",
       "inactive_accounts_due" = EXCLUDED."inactive_accounts_due"`,
    [now, trigger, JSON.stringify(deleted), inactiveAccountsDue],
  );
}

/** A failed run keeps the last success (its time and counts) and marks the attempt failed. */
async function recordFailure(db: Queryable, now: Date, trigger: RetentionTrigger): Promise<void> {
  if (!(await tableExists(db, RUNS_TABLE))) return;
  await db.query(
    `INSERT INTO "${RUNS_TABLE}" ("id", "last_attempt_at", "last_outcome", "last_trigger")
     VALUES (1, $1, 'failed', $2)
     ON CONFLICT ("id") DO UPDATE SET
       "last_attempt_at" = EXCLUDED."last_attempt_at", "last_outcome" = 'failed',
       "last_trigger" = EXCLUDED."last_trigger"`,
    [now, trigger],
  );
}

/**
 * Applies every policy once. `db` must be a single connection (a QueryRunner or a pg client) so the
 * session advisory lock and the deletes share it.
 */
export async function runRetentionPurge(
  db: Queryable,
  now: Date = new Date(),
  policies: readonly RetentionPolicy[] = RETENTION_POLICIES,
  options: RetentionRunOptions = {},
): Promise<RetentionReport> {
  const trigger = options.trigger ?? "command";
  const [lock] = rowsOf(
    await db.query("SELECT pg_try_advisory_lock($1) AS locked", [RETENTION_LOCK_KEY]),
  );
  if (!lock?.locked) {
    return { skipped: true, skipReason: "locked", deleted: {}, inactiveAccountsDue: 0 };
  }
  try {
    if (options.skipIfSucceededWithinMs !== undefined) {
      const last = await readLastRetentionSuccess(db);
      if (last && now.getTime() - last.getTime() < options.skipIfSucceededWithinMs) {
        return { skipped: true, skipReason: "recent", deleted: {}, inactiveAccountsDue: 0 };
      }
    }
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
      const inactiveAccountsDue = Number(due?.n ?? 0);
      await recordSuccess(db, now, trigger, deleted, inactiveAccountsDue);
      return { skipped: false, deleted, inactiveAccountsDue };
    } catch (error) {
      // A failure to record the failure (a dead connection) must not hide the first error.
      await recordFailure(db, now, trigger).catch(() => undefined);
      throw error;
    }
  } finally {
    await releaseLock(db);
  }
}

/** The session lock could not be released: the connection must be closed, never pooled. */
export class RetentionLockNotReleasedError extends Error {
  override name = "RetentionLockNotReleasedError";
}

/**
 * Releases the session lock. An aborted transaction (a failed ROLLBACK swallowed above) refuses
 * the unlock, so end it and try once more. If that fails too, throw: a pooled connection still
 * holding the lock would make every later run skip as "locked".
 */
async function releaseLock(db: Queryable): Promise<void> {
  const unlock = () => db.query("SELECT pg_advisory_unlock($1)", [RETENTION_LOCK_KEY]);
  try {
    await unlock();
  } catch {
    await db.query("ROLLBACK").catch(() => undefined);
    try {
      await unlock();
    } catch {
      throw new RetentionLockNotReleasedError("retention lock not released");
    }
  }
}

/**
 * Closes a query runner's connection instead of returning it to the pool, so its session (and
 * any advisory lock it holds) ends. Uses TypeORM's Postgres runner release-with-error, which tells
 * pg-pool to discard the client; retention.integration.spec.ts checks it still does.
 */
export async function discardConnection(
  runner: { release(): Promise<void> },
  error: Error,
): Promise<void> {
  const discard = (runner as { releasePostgresConnection?: (err: Error) => Promise<void> })
    .releasePostgresConnection;
  if (typeof discard === "function") await discard.call(runner, error);
  else await runner.release();
}

/** One line per policy plus the inactive count: names and counts only, never ids. */
export function describeRetentionReport(report: RetentionReport): string[] {
  if (report.skipped) {
    return [
      report.skipReason === "recent"
        ? "retention skipped: a run finished recently"
        : "retention skipped: another run holds the lock",
    ];
  }
  return [
    ...Object.entries(report.deleted).map(([name, n]) => `retention ${name} deleted=${n}`),
    `retention inactive_accounts_due=${report.inactiveAccountsDue}`,
  ];
}
