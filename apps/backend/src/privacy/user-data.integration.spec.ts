import "reflect-metadata";
import { AccountExportDocument } from "@flump/api-contract";
import { Logger } from "@nestjs/common";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../config/typeorm.options";
import { Account } from "../entities/account.entity";
import { AccountDeletionTombstone } from "../entities/account-deletion-tombstone.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { AgentAuditEvent } from "../entities/agent-audit-event.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { BudgetEntry } from "../entities/budget-entry.entity";
import { ImportBatch } from "../entities/import-batch.entity";
import { McpToken } from "../entities/mcp-token.entity";
import { SnapshotCheckin } from "../entities/snapshot-checkin.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { Transaction } from "../entities/transaction.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { InMemoryIdentityAdapter } from "../identity/identity.adapter";
import { assertSafeTestDatabase } from "../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../testing/dbTestMode";
import { discoverMigrations } from "../testing/discoverMigrations";
import { UserProfileService } from "../user-profile.service";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountExportService } from "./account-export.service";
import { LoggingBankConsentRevoker } from "./bank-consent-revoker";
import { tombstoneSubjectHash } from "./tombstone-key";
import { USER_DATA_REGISTRY } from "./user-data-registry";

// BE-04 on real Postgres: erasure completeness, two-user isolation, rollback, retry after a WorkOS
// failure, export contents and the reset. Drops the public schema, so a throwaway database only:
//   docker run --rm -d --name flump-pg-test -e POSTGRES_PASSWORD=postgres \
//     -e POSTGRES_DB=flump_privacy_test -p 55432:5432 postgres:18-alpine
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_privacy_test \
//     bunx vitest run src/privacy
const USER_A = "user_01HZX3Q9V7C2M8N4P6R0S5T1WA";
const USER_B = "user_01HZX3Q9V7C2M8N4P6R0S5T1WB";
const SECRET_ACCESS = "bank-access-token-SECRET-value";
const SECRET_REFRESH = "bank-refresh-token-SECRET-value";

describe.skipIf(resolveDbTestMode(process.env) === "skip")("user data (real Postgres)", () => {
  let ds: DataSource;
  let identity: InMemoryIdentityAdapter;
  let deletion: AccountDeletionService;
  let exporter: AccountExportService;
  const savedNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL as string;
    assertSafeTestDatabase(url, process.env);
    process.env.NODE_ENV = "test";
    const options = typeOrmOptionsFromEnv({ NODE_ENV: "test", DATABASE_URL: url });
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
  }, 60_000);

  afterAll(async () => {
    process.env.NODE_ENV = savedNodeEnv;
    if (ds?.isInitialized) await ds.destroy();
  });

  beforeEach(async () => {
    const tables = ds.entityMetadatas.map((m) => `"${m.tableName}"`).join(", ");
    await ds.query(`TRUNCATE ${tables} CASCADE`);
    identity = new InMemoryIdentityAdapter();
    deletion = new AccountDeletionService(ds, identity, new LoggingBankConsentRevoker());
    exporter = new AccountExportService(ds);
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** One row in every table that carries a user id, labelled so a leak is easy to spot. */
  const seed = async (userId: string, label: string) => {
    const m = ds.manager;
    const connection = await m.save(
      m.create(BankConnection, {
        userId,
        institutionId: "monzo",
        institutionName: `${label} Bank`,
        accessToken: `${SECRET_ACCESS}-${label}`,
        refreshToken: `${SECRET_REFRESH}-${label}`,
      }),
    );
    const account = await m.save(
      m.create(Account, {
        userId,
        name: `${label} saver`,
        type: "Saving",
        balance: 1234.5,
        connectionId: connection.id,
      }),
    );
    const batch = await m.save(
      m.create(ImportBatch, {
        userId,
        idempotencyKey: `idem-${label}`,
        payload: { accounts: [], balances: [], chunkKeys: [] },
        counts: { rows: 0, staged: 0, new: 0, overwrite: 0, unchanged: 0, skipped: 0, errors: 0 },
        validationErrors: {},
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );
    await m.save(
      m.create(AccountDetail, {
        accountId: account.id,
        userId,
        year: 2026,
        month: 10,
        value: 1000,
        asOfDate: "2026-10-31",
        importBatchId: batch.id,
      }),
    );
    await m.save(
      m.create(Transaction, {
        accountId: account.id,
        userId,
        amount: -12.34,
        description: `${label} coffee`,
        category: "food",
      }),
    );
    await m.save(m.create(SnapshotCheckin, { userId, month: "2026-10" }));
    await m.save(
      m.create(BudgetEntry, { userId, category: "housing", name: `${label} rent`, amount: 900 }),
    );
    await m.save(
      m.create(TaxRecord, {
        userId,
        type: "expense",
        source: "self-employed",
        category: "office",
        name: `${label} desk`,
        amount: 99,
        date: "2026-05-01",
        receiptFilename: "desk.png",
        receiptMimeType: "image/png",
        receiptData: "data:image/png;base64,AAAA",
      }),
    );
    const token = await m.save(
      m.create(McpToken, {
        userId,
        name: `${label} Claude`,
        tokenHash: `hash-SECRET-${label}`,
        tokenPrefix: "flp_abcd",
      }),
    );
    await m.save(
      m.create(AgentAuditEvent, {
        userId,
        tokenId: token.id,
        toolName: "get_accounts",
        outcome: "ok",
        latencyMs: 12,
        responseBytes: 345,
        argsFingerprint: "f".repeat(64),
      }),
    );
    await m.save(
      m.create(UserProfile, {
        userId,
        firstName: `${label}First`,
        annualSalary: 50000,
        taxRegion: "SCOTLAND",
        birthYear: 1990,
        monthlyHousingCost: 900,
      }),
    );
  };

  /** Every public table with a user_id column, straight from the catalogue (not the entities). */
  const userIdTables = async (): Promise<string[]> => {
    const rows: { table_name: string }[] = await ds.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'user_id' ORDER BY table_name`,
    );
    return rows.map((r) => r.table_name);
  };
  const rowsFor = async (table: string, userId: string): Promise<number> => {
    const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM "${table}" WHERE user_id = $1`, [
      userId,
    ]);
    return n;
  };
  const countsFor = async (userId: string) =>
    Object.fromEntries(
      await Promise.all(
        (await userIdTables()).map(async (t) => [t, await rowsFor(t, userId)] as const),
      ),
    );

  it("the catalogue's user_id tables are exactly the registry's tables", async () => {
    const registryTables = USER_DATA_REGISTRY.map((t) => ds.getMetadata(t.entity).tableName).sort();
    expect(await userIdTables()).toEqual(registryTables);
  });

  it("deletion leaves no row with the user's id in any table, and the other user's untouched", async () => {
    await seed(USER_A, "A");
    await seed(USER_B, "B");
    const before = await countsFor(USER_B);
    expect(Object.values(await countsFor(USER_A)).every((n) => n > 0)).toBe(true);

    await expect(deletion.deleteAccount(USER_A)).resolves.toEqual({ status: "deleted" });

    for (const [table, n] of Object.entries(await countsFor(USER_A))) {
      expect(n, `${table} still holds the deleted user's rows`).toBe(0);
    }
    expect(await countsFor(USER_B)).toEqual(before);
    expect(identity.deletedUsers).toEqual([USER_A]);

    const tombstones = await ds.getRepository(AccountDeletionTombstone).find();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].subjectHash).toBe(
      tombstoneSubjectHash(
        // The dev/test fallback key, as the service resolved it.
        (deletion as unknown as { key: string }).key,
        USER_A,
      ),
    );
    expect(tombstones[0].identityDeletedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(tombstones)).not.toContain(USER_A);
    const months =
      (tombstones[0].expiresAt.getUTCFullYear() - tombstones[0].deletedAt.getUTCFullYear()) * 12 +
      (tombstones[0].expiresAt.getUTCMonth() - tombstones[0].deletedAt.getUTCMonth());
    expect(months).toBe(24);
    await expect(deletion.isErased(USER_A)).resolves.toBe(true);
    await expect(deletion.isErased(USER_B)).resolves.toBe(false);
  });

  it("rolls everything back when a delete fails mid-transaction", async () => {
    await seed(USER_A, "A");
    const before = await countsFor(USER_A);
    // Accounts are deleted after transactions, history, check-ins and imports.
    await ds.query(`CREATE FUNCTION be04_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'be04 forced failure'; END $$`);
    await ds.query(
      "CREATE TRIGGER be04_fail BEFORE DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION be04_fail()",
    );
    try {
      await expect(deletion.deleteAccount(USER_A)).rejects.toThrow(/be04 forced failure/);
    } finally {
      await ds.query("DROP TRIGGER be04_fail ON accounts");
      await ds.query("DROP FUNCTION be04_fail()");
    }
    expect(await countsFor(USER_A)).toEqual(before);
    expect(await ds.getRepository(AccountDeletionTombstone).count()).toBe(0);
    expect(identity.deletedUsers).toEqual([]);
  });

  it("is idempotent: a WorkOS failure answers identity_pending and the same request retried finishes", async () => {
    await seed(USER_A, "A");
    identity.deleteFailure = new Error("WorkOS unavailable");
    await expect(deletion.deleteAccount(USER_A)).resolves.toEqual({ status: "identity_pending" });
    const [pending] = await ds.getRepository(AccountDeletionTombstone).find();
    expect(pending.identityDeletedAt).toBeNull();
    expect(Object.values(await countsFor(USER_A)).every((n) => n === 0)).toBe(true);

    identity.deleteFailure = null;
    await expect(deletion.deleteAccount(USER_A)).resolves.toEqual({ status: "deleted" });
    const all = await ds.getRepository(AccountDeletionTombstone).find();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(pending.id);
    expect(all[0].deletedAt.getTime()).toBe(pending.deletedAt.getTime());
    expect(all[0].identityDeletedAt).toBeInstanceOf(Date);
    expect(identity.deletedUsers).toEqual([USER_A]);
  });

  it("purges tombstones past their 24 months on the next deletion", async () => {
    await ds.getRepository(AccountDeletionTombstone).insert({
      subjectHash: "0".repeat(64),
      deletedAt: new Date("2020-01-01T00:00:00Z"),
      identityDeletedAt: new Date("2020-01-01T00:00:00Z"),
      expiresAt: new Date("2022-01-01T00:00:00Z"),
    });
    await seed(USER_A, "A");
    await deletion.deleteAccount(USER_A);
    const hashes = (await ds.getRepository(AccountDeletionTombstone).find()).map(
      (t) => t.subjectHash,
    );
    expect(hashes).not.toContain("0".repeat(64));
    expect(hashes).toHaveLength(1);
  });

  const exportFor = async (userId: string): Promise<string> => {
    const chunks: string[] = [];
    await exporter.writeExport(
      userId,
      async (c) => {
        chunks.push(c);
      },
      new Date("2026-11-14T09:00:00Z"),
    );
    return chunks.join("");
  };

  it("exports every table for the caller only, matching the schema, with no secrets", async () => {
    await seed(USER_A, "A");
    await seed(USER_B, "B");
    const text = await exportFor(USER_A);
    const doc = AccountExportDocument.parse(JSON.parse(text));

    expect(doc.schemaVersion).toBe(1);
    expect(doc.exportedAt).toBe("2026-11-14T09:00:00.000Z");
    expect(doc.userId).toBe(USER_A);
    expect(doc.profile?.firstName).toBe("AFirst");
    for (const t of USER_DATA_REGISTRY) {
      if (t.key === "profile") continue;
      expect((doc[t.key] as unknown[]).length, t.key).toBe(1);
    }
    expect(doc.accounts[0]).toMatchObject({ name: "A saver", balance: 1234.5 });
    expect(doc.taxRecords[0].receiptData).toBe("data:image/png;base64,AAAA");
    expect(doc.mcpTokens[0]).toMatchObject({ name: "A Claude", tokenPrefix: "flp_abcd" });

    // Nothing of B's, and no secret of anyone's.
    expect(text).not.toContain(USER_B);
    expect(text).not.toMatch(/\bB (saver|Bank|coffee|rent|desk|Claude)\b/);
    expect(text).not.toContain("BFirst");
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("idem-A");
    expect(text).not.toContain("f".repeat(64));
  });

  it("exports an empty document (profile null) for a user with no data", async () => {
    const doc = AccountExportDocument.parse(JSON.parse(await exportFor(USER_A)));
    expect(doc.profile).toBeNull();
    expect(doc.accounts).toEqual([]);
  });

  it("pages through tables larger than one batch without losing or repeating rows", async () => {
    await seed(USER_A, "A");
    const taxRecords = ds.getRepository(TaxRecord);
    for (let i = 0; i < 12; i++) {
      await taxRecords.save(
        taxRecords.create({
          userId: USER_A,
          type: "income",
          source: "paye",
          category: "salary",
          name: `pay ${i}`,
          amount: i,
          date: "2026-04-06",
        }),
      );
    }
    const doc = AccountExportDocument.parse(JSON.parse(await exportFor(USER_A)));
    expect(doc.taxRecords).toHaveLength(13);
    expect(new Set(doc.taxRecords.map((r) => r.id)).size).toBe(13);
  });

  it("reset clears every financial table and revokes MCP tokens, keeps the audit log and B's data", async () => {
    await seed(USER_A, "A");
    await seed(USER_B, "B");
    const beforeB = await countsFor(USER_B);
    const repo = <E extends object>(e: new () => E) => ds.getRepository(e);
    const service = new UserProfileService(
      repo(UserProfile),
      repo(Account),
      repo(Transaction),
      repo(AccountDetail),
      repo(BankConnection),
      repo(BudgetEntry),
      repo(TaxRecord),
      identity,
      ds,
      repo(SnapshotCheckin),
      repo(ImportBatch),
      repo(McpToken),
      new LoggingBankConsentRevoker(),
    );

    await service.resetFinancialData(USER_A);

    const after = await countsFor(USER_A);
    expect(after).toEqual({
      account_details: 0,
      accounts: 0,
      agent_audit_events: 1,
      bank_connections: 0,
      budget_entries: 0,
      import_batches: 0,
      mcp_tokens: 0,
      snapshot_checkins: 0,
      tax_records: 0,
      transactions: 0,
      user_profiles: 1,
    });
    const profile = await repo(UserProfile).findOneByOrFail({ userId: USER_A });
    expect(profile).toMatchObject({
      firstName: "AFirst",
      annualSalary: null,
      taxRegion: null,
      birthYear: null,
      monthlyHousingCost: null,
      hasResetFinancialData: true,
    });
    expect(await countsFor(USER_B)).toEqual(beforeB);
  });
});
