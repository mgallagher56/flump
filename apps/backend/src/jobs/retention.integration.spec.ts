import { DataSource, type DataSourceOptions, type QueryRunner } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { recordAuditEvent } from "../audit/audit-events";
import { grantConsent, withdrawConsent } from "../audit/consents";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations } from "../testing/discoverMigrations";
import { RETENTION_LOCK_KEY, RETENTION_POLICIES, runRetentionPurge } from "./retention";

// BE-06 (H12, M-PRIV2; rulings D4, D5) on real Postgres: the retention job deletes exactly the rows
// past each cutoff, keeps the rest, is safe to run twice and skips while another run holds the
// lock. Also checks the audit_events append-only trigger and consent withdrawal. Drops the public
// schema, so a throwaway database only:
//   docker run --rm -d --name flump-pg-test -e POSTGRES_PASSWORD=postgres \
//     -e POSTGRES_DB=flump_retention_test -p 55432:5432 postgres:18-alpine
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_retention_test \
//     bunx vitest run src/jobs/retention.integration.spec.ts

const NOW = new Date("2026-11-14T03:15:00Z");
const OWNER_ID = ["user", "retention", "a"].join("_");
const ago = (interval: string) => `'2026-11-14T03:15:00Z'::timestamptz - interval '${interval}'`;

describe.skipIf(resolveDbTestMode(process.env) === "skip")(
  "retention purge (real Postgres)",
  () => {
    const savedNodeEnv = process.env.NODE_ENV;
    let ds: DataSource;
    let runner: QueryRunner;

    beforeAll(async () => {
      assertSafeTestDatabase(process.env.TEST_DATABASE_URL as string, process.env);
      process.env.NODE_ENV = "test";
      const options = typeOrmOptionsFromEnv({
        NODE_ENV: "test",
        DATABASE_URL: process.env.TEST_DATABASE_URL as string,
      });
      ds = new DataSource({
        ...(options as DataSourceOptions),
        migrations: await discoverMigrations(),
        synchronize: false,
        migrationsRun: false,
      });
      await ds.initialize();
      await ds.query("DROP SCHEMA public CASCADE");
      await ds.query("CREATE SCHEMA public");
      await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await ds.runMigrations();
      runner = ds.createQueryRunner();
      await runner.connect();
    }, 60_000);

    afterAll(async () => {
      process.env.NODE_ENV = savedNodeEnv;
      await runner?.release();
      if (ds?.isInitialized) await ds.destroy();
    });

    beforeEach(async () => {
      await ds.query(
        `TRUNCATE audit_events, agent_audit_events, import_batches, mcp_tokens, bank_oauth_states,
         account_deletion_tombstones, consents, idempotency_keys, user_profiles, accounts CASCADE`,
      );
    });

    const count = async (table: string): Promise<number> =>
      Number((await ds.query(`SELECT count(*)::int AS n FROM "${table}"`))[0].n);

    /** One row just past each cutoff and one just inside it, per policy. */
    async function seed(): Promise<void> {
      for (const age of ["13 months 1 day", "12 months 28 days"]) {
        await ds.query(
          `INSERT INTO audit_events (user_id, action, created_at) VALUES ($1, 'mcp_token.minted', ${ago(age)})`,
          [OWNER_ID],
        );
        await ds.query(
          `INSERT INTO agent_audit_events (user_id, tool_name, outcome, latency_ms, response_bytes, created_at)
         VALUES ($1, 'list_accounts', 'ok', 1, 1, ${ago(age)})`,
          [OWNER_ID],
        );
      }
      for (const [i, age] of ["31 days", "29 days"].entries()) {
        await ds.query(
          `INSERT INTO import_batches (user_id, status, idempotency_key, payload, counts, validation_errors, expires_at, created_at, updated_at)
         VALUES ($1, 'expired', $2, '{"accounts":[],"balances":[],"chunkKeys":[]}', '{}', '{}', ${ago(age)}, ${ago(age)}, ${ago(age)})`,
          [OWNER_ID, `key-${i}`],
        );
      }
      for (const [i, cols] of [
        ["revoked_at", "13 months 1 day"],
        ["revoked_at", "12 months"],
        ["expires_at", "13 months 1 day"],
        ["expires_at", "1 month"],
      ].entries()) {
        await ds.query(
          `INSERT INTO mcp_tokens (user_id, name, token_hash, token_prefix, scopes, ${cols[0]})
         VALUES ($1, 't', $2, 'p', 'mcp:simulate', ${ago(cols[1] as string)})`,
          [OWNER_ID, `hash-${i}`],
        );
      }
      // An active token with no expiry and no revocation stays forever.
      await ds.query(
        `INSERT INTO mcp_tokens (user_id, name, token_hash, token_prefix, scopes)
       VALUES ($1, 'live', 'hash-live', 'p', 'mcp:simulate')`,
        [OWNER_ID],
      );
      for (const [i, age] of ["2 days", "1 hour"].entries()) {
        await ds.query(
          `INSERT INTO bank_oauth_states (user_id, institution_id, state_hash, code_verifier, redirect_uri, expires_at)
         VALUES ($1, 'monzo', $2, 'v', 'https://example.test/cb', ${ago(age)})`,
          [OWNER_ID, (i ? "b" : "a").repeat(64)],
        );
      }
      for (const [i, age] of ["25 hours", "1 hour"].entries()) {
        await ds.query(
          `INSERT INTO idempotency_keys (user_id, route_id, key, request_hash, status_code, created_at)
         VALUES ($1, 'accounts.create', $2, $3, 201, ${ago(age)})`,
          [OWNER_ID, `idem-${i}`, "e".repeat(64)],
        );
      }
      for (const [i, expiry] of [ago("1 day"), ago("-1 day")].entries()) {
        await ds.query(
          `INSERT INTO account_deletion_tombstones (subject_hash, deleted_at, expires_at)
         VALUES ($1, ${ago("24 months")}, ${expiry})`,
          [`${i}`.repeat(64)],
        );
      }
      const [account] = await ds.query(
        `INSERT INTO accounts (user_id, name, type, balance) VALUES ($1, 'Loan', 'Loan', -100) RETURNING id`,
        [OWNER_ID],
      );
      for (const age of ["91 days", "89 days"]) {
        await ds.query(
          `INSERT INTO liability_sign_backfill (account_id, table_name, row_id, old_value, new_value, backfilled_at)
         VALUES ($1, 'accounts', $2, 100, -100, ${ago(age)})`,
          [account.id, account.id],
        );
      }
      for (const [i, age] of ["24 months 1 day", "23 months"].entries()) {
        await ds.query(
          `INSERT INTO user_profiles (user_id, last_active_at) VALUES ($1, ${ago(age)})`,
          [`user_inactive_${i}`],
        );
      }
    }

    it("deletes every row past its cutoff and keeps the rest", async () => {
      await seed();
      const report = await runRetentionPurge(runner, NOW);
      expect(report).toEqual({
        skipped: false,
        deleted: {
          audit_events: 1,
          agent_audit_events: 1,
          import_batches: 1,
          mcp_tokens_closed: 2,
          bank_oauth_states: 1,
          idempotency_keys: 1,
          account_deletion_tombstones: 1,
          liability_sign_backfill: 1,
        },
        inactiveAccountsDue: 1,
      });
      expect(await count("audit_events")).toBe(1);
      expect(await count("agent_audit_events")).toBe(1);
      expect(await count("import_batches")).toBe(1);
      expect(await count("mcp_tokens")).toBe(3);
      expect(await count("bank_oauth_states")).toBe(1);
      expect(await count("idempotency_keys")).toBe(1);
      expect(await count("account_deletion_tombstones")).toBe(1);
      expect(await count("liability_sign_backfill")).toBe(1);
      // Inactive accounts are reported, never erased by the purge.
      expect(await count("user_profiles")).toBe(2);
    });

    it("is safe to run twice: the second run deletes nothing", async () => {
      await seed();
      await runRetentionPurge(runner, NOW);
      const second = await runRetentionPurge(runner, NOW);
      expect(Object.values(second.deleted).every((n) => n === 0)).toBe(true);
    });

    it("covers every policy table in the report", async () => {
      const report = await runRetentionPurge(runner, NOW);
      expect(Object.keys(report.deleted)).toEqual(RETENTION_POLICIES.map((p) => p.name));
    });

    it("skips while another run holds the lock", async () => {
      await seed();
      const other = ds.createQueryRunner();
      await other.connect();
      try {
        await other.query("SELECT pg_advisory_lock($1)", [RETENTION_LOCK_KEY]);
        expect((await runRetentionPurge(runner, NOW)).skipped).toBe(true);
        expect(await count("audit_events")).toBe(2);
      } finally {
        await other.query("SELECT pg_advisory_unlock($1)", [RETENTION_LOCK_KEY]);
        await other.release();
      }
    });

    it("deletes in batches past the batch size", async () => {
      await ds.query(
        `INSERT INTO audit_events (user_id, action, created_at)
       SELECT $1, 'account.deleted', ${ago("14 months")} FROM generate_series(1, 5003)`,
        [OWNER_ID],
      );
      const report = await runRetentionPurge(runner, NOW);
      expect(report.deleted.audit_events).toBe(5003);
      expect(await count("audit_events")).toBe(0);
    });

    it("audit_events is append-only: an UPDATE is refused, a DELETE is allowed", async () => {
      await recordAuditEvent(ds.manager, { userId: OWNER_ID, action: "mcp_token.revoked" });
      await expect(ds.query(`UPDATE audit_events SET action = 'account.deleted'`)).rejects.toThrow(
        /append-only/,
      );
      await ds.query("DELETE FROM audit_events");
      expect(await count("audit_events")).toBe(0);
    });

    it("refuses an unknown audit action at the database", async () => {
      await expect(
        ds.query(`INSERT INTO audit_events (user_id, action) VALUES ($1, 'made.up')`, [OWNER_ID]),
      ).rejects.toThrow(/CHK_audit_events_action/);
    });

    it("withdraws a consent once and leaves others open", async () => {
      const target = "00000000-0000-4000-8000-000000000001";
      const other = "00000000-0000-4000-8000-000000000002";
      await grantConsent(ds.manager, {
        userId: OWNER_ID,
        kind: "ai_access",
        version: "mcp:simulate",
        targetId: target,
      });
      await grantConsent(ds.manager, {
        userId: OWNER_ID,
        kind: "ai_access",
        version: "mcp:simulate",
        targetId: other,
      });
      expect(
        await withdrawConsent(ds.manager, {
          userId: OWNER_ID,
          kind: "ai_access",
          targetId: target,
        }),
      ).toBe(1);
      expect(
        await withdrawConsent(ds.manager, {
          userId: OWNER_ID,
          kind: "ai_access",
          targetId: target,
        }),
      ).toBe(0);
      const open = await ds.query(`SELECT target_id FROM consents WHERE withdrawn_at IS NULL`);
      expect(open).toEqual([{ target_id: other }]);
    });
  },
);
