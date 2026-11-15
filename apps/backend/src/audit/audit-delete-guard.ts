/**
 * The `audit_events` delete guard (SEC-F, finding S10).
 *
 * `audit_events` refuses every UPDATE and every TRUNCATE, and refuses a DELETE unless the
 * transaction has said why it is deleting (migration AuditEventsDeleteAndTruncateGuards1795100000000).
 * Two reasons exist. In the running service each has exactly one caller:
 *
 * - `retention`: the daily purge of rows past 13 months (`jobs/retention.ts`, ruling D4).
 * - `erasure`: the account-deletion sweep (`modules/privacy/account-deletion.service.ts`).
 *
 * Outside the service, the staging reseed (`scripts/ops/seed-synthetic.ts`) declares `erasure` and
 * the test cleanup helper (`testing/emptyTables.ts`) declares `retention`.
 *
 * The reason is a transaction-local Postgres setting, so it ends with the transaction and never
 * leaks to the next user of a pooled connection. Like the UPDATE trigger, this stops a bug in the
 * app from removing audit rows; it does not stop someone holding the app's database credential
 * (they can set the reason or drop the trigger). The restricted database role that closes that is
 * an owner step: docs/audit/backend-2026-11/OWNER-SETUP.md, SEC-F.
 */
export const AUDIT_DELETE_SETTING = "flump.audit_delete";

export type AuditDeleteReason = "retention" | "erasure";

/** Anything that runs a parameterised query (an EntityManager, a QueryRunner, a pg client). */
interface Queryable {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

/**
 * Allows DELETE on `audit_events` for the rest of the current transaction. Must be called inside
 * one: outside a transaction the setting lasts for this statement only and the delete is refused.
 */
export async function allowAuditDelete(db: Queryable, reason: AuditDeleteReason): Promise<void> {
  await db.query("SELECT set_config($1, $2, true)", [AUDIT_DELETE_SETTING, reason]);
}
