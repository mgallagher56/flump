import "reflect-metadata";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import {
  BankAuthExpiredError,
  BankSyncOrchestrator,
  BankUnavailableError,
  safeDecryptBankingToken,
} from "@flump/banking/server";
import { ConflictException, Logger, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DataSource, type DataSourceOptions } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { typeOrmOptionsFromEnv } from "../../config/typeorm.options";
import { Account } from "../../entities/account.entity";
import { AccountDetail } from "../../entities/account-detail.entity";
import { BankConnection } from "../../entities/bank-connection.entity";
import { Transaction } from "../../entities/transaction.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { assertSafeTestDatabase } from "../../testing/assertSafeTestDatabase";
import { resolveDbTestMode } from "../../testing/dbTestMode";
import { discoverMigrations, type MigrationClass } from "../../testing/discoverMigrations";
import { FinanceService } from "../finance/finance.service";
import { revokeAllBankConsentsForUser } from "./bank-connection-consent";
import { consumeOAuthState, issueOAuthState } from "./bank-connection-oauth";
import { accessTokenAad, BankConnectionSync, refreshTokenAad } from "./bank-connection-sync";
import { ProviderBankConsentRevoker } from "./bank-consent-revoker";
import { createFakeBank, PROVIDER_ECHO_MARKER } from "./providers/__fixtures__/fake-bank";
import { monzoCase } from "./providers/__fixtures__/provider-cases";
import type { BankProvider, ProviderAccount } from "./providers/provider.interface";
import type { BankProviderRegistry } from "./providers/provider.registry";

// BE-12 (audit H2 sync side, H3, H4, H10, M4, M11, M13). Real Postgres only, with a scripted
// provider or the fake bank (D11: never a real provider). Same throwaway-database rules as
// migrations.integration.spec.ts (this suite DROPs the public schema):
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55512/flump_be12_test \
//     bunx vitest run src/modules/banking/bank-connection-sync.integration.spec.ts
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const PERSON = "user-be12";
const OTHER_PERSON = "user-be12-other";
// Low entropy on purpose, built at runtime: a test key must not look like a real secret.
const TEST_KEY = "k".repeat(40);
const MIGRATION = "BankSyncIntegrity1794358400000";

const account = (ext: string, balance: number, extra: Partial<ProviderAccount> = {}) =>
  ({
    externalAccountId: ext,
    name: `Account ${ext}`,
    type: "Current",
    balance,
    currency: "GBP",
    ...extra,
  }) as ProviderAccount;

type Scripted = BankProvider & {
  fetchAccounts: ReturnType<typeof vi.fn>;
  refreshToken: ReturnType<typeof vi.fn>;
  revokeConnection: ReturnType<typeof vi.fn>;
};

function scriptedProvider(
  accounts: () => Promise<ProviderAccount[]> | ProviderAccount[],
): Scripted {
  return {
    getAuthUrl: (clientId: string, redirectUri: string, state: string) =>
      `https://auth.example.test/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    exchangeCode: vi.fn(),
    refreshToken: vi.fn(async () => ({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      expiresIn: 3600,
    })),
    revokeConnection: vi.fn(async () => ({ revoked: true as const })),
    fetchAccounts: vi.fn(async () => accounts()),
    fetchTransactions: vi.fn(async () => []),
  } as unknown as Scripted;
}

/** The pre-BE-12 ciphertext format: `iv:tag:ct`, no version, no associated data. */
function legacyEncrypt(plaintext: string, secret: string): string {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const ct = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ct}`;
}

describe.skipIf(resolveDbTestMode(process.env) === "skip")("bank sync (real Postgres)", () => {
  let ds: DataSource;
  let migrations: MigrationClass[] = [];
  let config: Record<string, string | undefined>;
  const savedKey = process.env.BANKING_TOKEN_ENCRYPTION_KEY;
  const savedKeys = process.env.BANKING_TOKEN_ENCRYPTION_KEYS;

  beforeAll(async () => {
    migrations = await discoverMigrations();
  });

  beforeEach(async () => {
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = TEST_KEY;
    delete process.env.BANKING_TOKEN_ENCRYPTION_KEYS;
    config = { MONZO_CLIENT_ID: "cid", MONZO_CLIENT_SECRET: "secret" };
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
    vi.unstubAllGlobals();
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = savedKey;
    if (savedKeys === undefined) delete process.env.BANKING_TOKEN_ENCRYPTION_KEYS;
    else process.env.BANKING_TOKEN_ENCRYPTION_KEYS = savedKeys;
    if (ds?.isInitialized) await ds.destroy();
  });

  const financeWith = (provider: BankProvider | undefined) =>
    new FinanceService(
      ds.getRepository(Account),
      ds.getRepository(Transaction),
      ds.getRepository(AccountDetail),
      ds.getRepository(BankConnection),
      ds.getRepository(UserProfile),
      { getProvider: () => provider } as unknown as BankProviderRegistry,
      { get: (key: string) => config[key] } as unknown as ConfigService,
    );

  const insertConnection = async (
    fields: Partial<BankConnection> & { plainAccess?: string; plainRefresh?: string } = {},
    userId = PERSON,
  ): Promise<string> => {
    const { plainAccess = "access-1", plainRefresh, ...rest } = fields;
    const repo = ds.getRepository(BankConnection);
    const saved = await repo.save(
      repo.create({
        userId,
        institutionId: "monzo",
        institutionName: "Monzo Bank",
        status: "connected",
        authType: "oauth",
        ...rest,
      }),
    );
    await repo.update(saved.id, {
      accessToken:
        fields.accessToken ??
        BankSyncOrchestrator.encryptToken(plainAccess, accessTokenAad(saved.id)),
      refreshToken:
        fields.refreshToken ??
        (plainRefresh
          ? BankSyncOrchestrator.encryptToken(plainRefresh, refreshTokenAad(saved.id))
          : null),
    });
    return saved.id;
  };

  const connectionRow = (id: string) => ds.getRepository(BankConnection).findOneByOrFail({ id });
  const accountRows = (connectionId: string) =>
    ds.query(
      `SELECT id, external_account_id, balance FROM accounts WHERE connection_id = $1 ORDER BY external_account_id`,
      [connectionId],
    ) as Promise<Array<{ id: string; external_account_id: string; balance: string }>>;
  const detailCount = async (accountId: string) =>
    Number(
      (
        await ds.query("SELECT count(*)::int AS n FROM account_details WHERE account_id = $1", [
          accountId,
        ])
      )[0].n,
    );

  describe("duplicates (H4)", () => {
    it("two concurrent syncs create one account each: the second gets 409", async () => {
      const id = await insertConnection();
      let open: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        open = resolve;
      });
      const provider = scriptedProvider(async () => {
        await gate;
        return [account("a", 100), account("b", 200)];
      });
      const finance = financeWith(provider);

      const first = finance.syncBankConnection(PERSON, id);
      await vi.waitFor(() => expect(provider.fetchAccounts).toHaveBeenCalledTimes(1));
      await expect(finance.syncBankConnection(PERSON, id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      open();
      await expect(first).resolves.toMatchObject({ success: true });

      // The lease is released: a later sync runs, and still creates nothing new.
      await expect(finance.syncBankConnection(PERSON, id)).resolves.toMatchObject({
        success: true,
      });
      expect((await accountRows(id)).map((r) => r.external_account_id)).toEqual(["a", "b"]);
      expect((await connectionRow(id)).syncStartedAt).toBeNull();
    });

    it("concurrent account writes that bypass the lease still insert one row per account", async () => {
      const id = await insertConnection();
      const sync = new BankConnectionSync(ds);
      const accounts = [account("a", 100), account("b", 200), account("c", 300)];
      await Promise.all([1, 2, 3, 4].map(() => sync.writeAccounts(id, PERSON, accounts)));
      const rows = await accountRows(id);
      expect(rows.map((r) => r.external_account_id)).toEqual(["a", "b", "c"]);
      for (const row of rows) expect(await detailCount(row.id)).toBe(1);
    });

    it("two concurrent token connects to one bank make one connection", async () => {
      const finance = financeWith(scriptedProvider(() => [account("a", 1)]));
      await Promise.allSettled([
        finance.connectBank(PERSON, { institutionId: "monzo", token: "pat-1" }),
        finance.connectBank(PERSON, { institutionId: "monzo", token: "pat-2" }),
      ]);
      expect(await ds.getRepository(BankConnection).countBy({ userId: PERSON })).toBe(1);
      expect(Number((await ds.query("SELECT count(*)::int AS n FROM accounts"))[0].n)).toBe(1);
    });

    it("a slow sync whose lease lapsed does not clear the newer sync's lease", async () => {
      const id = await insertConnection();
      const sync = new BankConnectionSync(ds);
      const first = await sync.claim(id, PERSON);
      await ds.query(
        `UPDATE bank_connections SET sync_started_at = now() - interval '10 minutes' WHERE id = $1`,
        [id],
      );
      const second = await sync.claim(id, PERSON);
      expect(second).not.toBeNull();
      await sync.release(id, first as string);
      expect(await sync.claim(id, PERSON)).toBeNull();
      await sync.release(id, second as string);
      expect(await sync.claim(id, PERSON)).not.toBeNull();
    });

    it("a disconnect during a sync leaves no accounts behind", async () => {
      const id = await insertConnection();
      let open: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        open = resolve;
      });
      const provider = scriptedProvider(async () => {
        await gate;
        return [account("a", 100)];
      });
      const finance = financeWith(provider);
      const syncing = finance.syncBankConnection(PERSON, id).catch((e: unknown) => e);
      await vi.waitFor(() => expect(provider.fetchAccounts).toHaveBeenCalledTimes(1));
      await finance.deleteBankConnection(PERSON, id);
      open();
      expect(await syncing).toBeInstanceOf(NotFoundException);
      expect(Number((await ds.query("SELECT count(*)::int AS n FROM accounts"))[0].n)).toBe(0);
      expect(Number((await ds.query("SELECT count(*)::int AS n FROM account_details"))[0].n)).toBe(
        0,
      );
    });

    it("a lapsed lease (crashed sync) does not block the next sync", async () => {
      const id = await insertConnection();
      await ds.query(
        `UPDATE bank_connections SET sync_started_at = now() - interval '10 minutes' WHERE id = $1`,
        [id],
      );
      const finance = financeWith(scriptedProvider(() => [account("a", 1)]));
      await expect(finance.syncBankConnection(PERSON, id)).resolves.toMatchObject({
        success: true,
      });
    });

    it("the migration removes existing duplicates, keeping the oldest, then the index refuses new ones", async () => {
      while (
        (await ds.query("SELECT name FROM migrations")).some(
          (r: { name: string }) => r.name === MIGRATION,
        )
      ) {
        await ds.undoLastMigration();
      }
      const conn = "11111111-1111-4111-8111-111111111111";
      const insert = (createdAt: string) =>
        ds.query(
          `INSERT INTO accounts (user_id, name, type, balance, currency, connection_id, external_account_id, created_at)
           VALUES ($1, 'Dup', 'Current', 10, 'GBP', $2, 'ext', $3) RETURNING id`,
          [PERSON, conn, createdAt],
        );
      const [[oldest], [newer]] = await Promise.all([insert("2026-01-01"), insert("2026-02-01")]);
      await ds.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1, $2, 2026, 2, 10, '2026-02-28', 'connected')`,
        [newer.id, PERSON],
      );
      await ds.runMigrations();
      expect((await accountRows(conn)).map((r) => r.id)).toEqual([oldest.id]);
      expect(await detailCount(newer.id)).toBe(0);
      await expect(insert("2026-03-01")).rejects.toThrow();
    });
  });

  describe("tokens (H3, M11)", () => {
    it("an expired token refreshes with the refresh grant, under the lock, and is stored re-encrypted", async () => {
      const id = await insertConnection({
        plainRefresh: "refresh-1",
        expiresAt: new Date(Date.now() - 60_000),
      });
      const provider = scriptedProvider(() => [account("a", 50)]);
      const result = await financeWith(provider).syncBankConnection(PERSON, id);

      expect(result).toMatchObject({ success: true });
      expect(provider.refreshToken).toHaveBeenCalledWith("cid", "secret", "refresh-1");
      expect(provider.exchangeCode).not.toHaveBeenCalled();
      expect(provider.fetchAccounts.mock.calls[0]?.[0]).toBe("access-2");
      expect(provider.fetchAccounts.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);

      const row = await connectionRow(id);
      expect(row.accessToken).toMatch(/^v1:/);
      expect(BankSyncOrchestrator.decryptToken(row.accessToken as string, accessTokenAad(id))).toBe(
        "access-2",
      );
      expect(
        BankSyncOrchestrator.decryptToken(row.refreshToken as string, refreshTokenAad(id)),
      ).toBe("refresh-2");
      expect(row.expiresAt?.getTime()).toBeGreaterThan(Date.now());
      // Bound to this connection and column: no decrypting as another row's, or as the refresh token.
      expect(() =>
        safeDecryptBankingToken(row.accessToken as string, { aad: refreshTokenAad(id) }),
      ).toThrow();
      expect(() =>
        safeDecryptBankingToken(row.accessToken as string, { aad: "another-connection" }),
      ).toThrow();
    });

    it("two concurrent refreshes spend the refresh token once", async () => {
      const id = await insertConnection({
        plainRefresh: "refresh-1",
        expiresAt: new Date(Date.now() - 60_000),
      });
      const provider = scriptedProvider(() => []);
      const sync = new BankConnectionSync(ds);
      const creds = { clientId: "cid", clientSecret: "secret" };
      const tokens = await Promise.all([
        sync.activeAccessToken(id, provider, creds),
        sync.activeAccessToken(id, provider, creds),
      ]);
      expect(tokens).toEqual(["access-2", "access-2"]);
      expect(provider.refreshToken).toHaveBeenCalledTimes(1);
    });

    it("refreshes against the fake Monzo API with grant_type=refresh_token and no redirect URI", async () => {
      const bank = createFakeBank(monzoCase.routes);
      vi.stubGlobal("fetch", bank.fetch);
      const id = await insertConnection({
        plainRefresh: "refresh-1",
        expiresAt: new Date(Date.now() - 60_000),
      });
      const result = await financeWith(monzoCase.make()).syncBankConnection(PERSON, id);
      expect(result).toMatchObject({ success: true });
      const form = new URLSearchParams(bank.callsTo(monzoCase.tokenRouteKey)[0]?.body);
      expect(form.get("grant_type")).toBe("refresh_token");
      expect(form.get("refresh_token")).toBe("refresh-1");
      expect(form.has("redirect_uri")).toBe(false);
      expect(bank.unmatched).toEqual([]);
    });

    it("an expiring token without client credentials needs reconnecting, it never falls back", async () => {
      config = {};
      const id = await insertConnection({
        plainRefresh: "refresh-1",
        expiresAt: new Date(Date.now() - 60_000),
      });
      const provider = scriptedProvider(() => [account("a", 1)]);
      const result = await financeWith(provider).syncBankConnection(PERSON, id);
      expect(result).toMatchObject({ success: false, connection: { status: "needs_reconnect" } });
      expect(provider.refreshToken).not.toHaveBeenCalled();
    });

    it("a legacy token still decrypts and is re-encrypted to v1 with the connection id on the next sync", async () => {
      const id = await insertConnection({ accessToken: legacyEncrypt("legacy-access", TEST_KEY) });
      const provider = scriptedProvider(() => [account("a", 1)]);
      await financeWith(provider).syncBankConnection(PERSON, id);
      expect(provider.fetchAccounts.mock.calls[0]?.[0]).toBe("legacy-access");
      const row = await connectionRow(id);
      expect(row.accessToken).toMatch(/^v1:/);
      expect(BankSyncOrchestrator.decryptToken(row.accessToken as string, accessTokenAad(id))).toBe(
        "legacy-access",
      );
    });

    it("rotation: a v1 token moves to v2 on the next sync once the key list names v2 first", async () => {
      const id = await insertConnection();
      process.env.BANKING_TOKEN_ENCRYPTION_KEYS = `2:${"n".repeat(40)},1:${TEST_KEY}`;
      const provider = scriptedProvider(() => [account("a", 1)]);
      await financeWith(provider).syncBankConnection(PERSON, id);
      expect(provider.fetchAccounts.mock.calls[0]?.[0]).toBe("access-1");
      expect((await connectionRow(id)).accessToken).toMatch(/^v2:/);
    });
  });

  describe("partial sync and failures (H2, M13)", () => {
    it("an unreadable balance never writes a snapshot; the rest sync and it is reported as partial", async () => {
      const id = await insertConnection();
      let accounts = [account("a", 100), account("b", 200)];
      const finance = financeWith(scriptedProvider(() => accounts));
      await finance.syncBankConnection(PERSON, id);
      const before = await accountRows(id);

      accounts = [account("a", 150), account("b", Number.NaN)];
      const result = await finance.syncBankConnection(PERSON, id);
      expect(result).toMatchObject({
        success: true,
        accounts: { updated: 1, skipped: 1 },
        message: expect.stringMatching(/1 of 2/),
      });
      const after = await accountRows(id);
      expect(Number(after[0]?.balance)).toBe(150);
      expect(after[1]?.balance).toBe(before[1]?.balance);
      const [b] = await ds.query("SELECT value FROM account_details WHERE account_id = $1", [
        after[1]?.id,
      ]);
      expect(Number(b.value)).toBe(200);
    });

    it("a new account with an unreadable balance is not created at all", async () => {
      const id = await insertConnection();
      const finance = financeWith(
        scriptedProvider(() => [account("a", 1), account("b", Number.POSITIVE_INFINITY)]),
      );
      await finance.syncBankConnection(PERSON, id);
      expect((await accountRows(id)).map((r) => r.external_account_id)).toEqual(["a"]);
    });

    it("a provider outage writes nothing and marks the connection as errored", async () => {
      const id = await insertConnection();
      const provider = scriptedProvider(() => {
        throw new BankUnavailableError({
          provider: "monzo",
          operation: "fetch balance",
          reason: "timeout",
        });
      });
      const result = await financeWith(provider).syncBankConnection(PERSON, id);
      expect(result).toMatchObject({ success: false, connection: { status: "error" } });
      expect(result).not.toHaveProperty("error", expect.stringMatching(/monzo|timeout/));
      expect(await accountRows(id)).toEqual([]);
      expect((await connectionRow(id)).syncStartedAt).toBeNull();
    });

    it("expired consent (AUTH_EXPIRED) marks the connection needs_reconnect", async () => {
      const id = await insertConnection();
      const provider = scriptedProvider(() => {
        throw new BankAuthExpiredError({
          provider: "monzo",
          operation: "fetch accounts",
          status: 401,
        });
      });
      const result = await financeWith(provider).syncBankConnection(PERSON, id);
      expect(result).toMatchObject({
        success: false,
        connection: { status: "needs_reconnect" },
        error: expect.stringMatching(/reconnect/i),
      });
    });

    it("an undecryptable stored token needs reconnecting", async () => {
      const id = await insertConnection({ accessToken: "v1:00:00:00" });
      const result = await financeWith(scriptedProvider(() => [])).syncBankConnection(PERSON, id);
      expect(result).toMatchObject({ success: false, connection: { status: "needs_reconnect" } });
    });
  });

  describe("disconnect and consent (H10)", () => {
    it("revokes at the provider first, then deletes the connection and everything synced from it", async () => {
      const id = await insertConnection();
      const provider = scriptedProvider(() => [account("a", 100)]);
      const finance = financeWith(provider);
      await finance.syncBankConnection(PERSON, id);
      const [acc] = await accountRows(id);

      await expect(finance.deleteBankConnection(PERSON, id)).resolves.toEqual({
        success: true,
        consentRevoked: true,
      });
      expect(provider.revokeConnection).toHaveBeenCalledWith("access-1");
      expect(await accountRows(id)).toEqual([]);
      expect(await detailCount(acc?.id as string)).toBe(0);
      expect(await ds.getRepository(BankConnection).countBy({ id })).toBe(0);
    });

    it("still deletes when the provider cannot revoke, and says so", async () => {
      const id = await insertConnection();
      const provider = scriptedProvider(() => []);
      provider.revokeConnection.mockRejectedValue(new Error("down"));
      await expect(financeWith(provider).deleteBankConnection(PERSON, id)).resolves.toEqual({
        success: true,
        consentRevoked: false,
      });
      expect(await ds.getRepository(BankConnection).countBy({ id })).toBe(0);
    });

    it("revokes through the fake Monzo logout endpoint", async () => {
      const bank = createFakeBank(monzoCase.routes);
      vi.stubGlobal("fetch", bank.fetch);
      const id = await insertConnection();
      await financeWith(monzoCase.make()).deleteBankConnection(PERSON, id);
      expect(bank.callsTo("revoke")).toHaveLength(1);
    });

    it("revokeAllBankConsentsForUser (account deletion) covers every connection and never throws", async () => {
      await insertConnection();
      await insertConnection({ institutionId: "starling" });
      await insertConnection({ institutionId: "trading212", accessToken: "v1:00:00:00" });
      await insertConnection({}, OTHER_PERSON);
      const provider = scriptedProvider(() => []);
      provider.revokeConnection
        .mockResolvedValueOnce({ revoked: true })
        .mockResolvedValueOnce({ revoked: false, reason: "unsupported" });
      const summary = await revokeAllBankConsentsForUser(
        {
          connections: ds.getRepository(BankConnection),
          providers: { getProvider: () => provider },
        },
        PERSON,
      );
      expect(summary).toEqual({ attempted: 3, revoked: 1, unsupported: 1, failed: 1 });
    });
  });

  describe("account deletion and reset seam (BE-04)", () => {
    it("ProviderBankConsentRevoker revokes each listed connection of that user only, and never throws", async () => {
      const mine = await insertConnection();
      const theirs = await insertConnection({}, OTHER_PERSON);
      const provider = scriptedProvider(() => []);
      const revoker = new ProviderBankConsentRevoker(ds.getRepository(BankConnection), {
        getProvider: () => provider,
      } as unknown as BankProviderRegistry);
      await revoker.revokeAll(PERSON, [
        { id: mine, institutionId: "monzo", authType: "oauth" },
        { id: theirs, institutionId: "monzo", authType: "oauth" },
      ]);
      expect(provider.revokeConnection).toHaveBeenCalledTimes(1);
      expect(provider.revokeConnection).toHaveBeenCalledWith("access-1");

      provider.revokeConnection.mockRejectedValue(new Error("down"));
      await expect(
        revoker.revokeAll(PERSON, [{ id: mine, institutionId: "monzo", authType: "oauth" }]),
      ).resolves.toBeUndefined();
    });
  });

  describe("account deletion and reset seam against the fake Monzo API", () => {
    const monzoRevoker = () =>
      new ProviderBankConsentRevoker(ds.getRepository(BankConnection), {
        getProvider: () => monzoCase.make(),
      } as unknown as BankProviderRegistry);
    const auditEvents = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls
        .map((args: unknown[]) => String(args[0]))
        .filter((m: string) => m.includes('"bank_consent_revoke"'))
        .map((m: string) => JSON.parse(m));

    it("revokes through the logout endpoint and audits counts only", async () => {
      const bank = createFakeBank(monzoCase.routes);
      vi.stubGlobal("fetch", bank.fetch);
      const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
      try {
        const id = await insertConnection();
        await monzoRevoker().revokeAll(PERSON, [{ id, institutionId: "monzo", authType: "oauth" }]);
        expect(bank.callsTo("revoke")).toHaveLength(1);
        const [event] = auditEvents(log);
        expect(event).toEqual({
          event: "bank_consent_revoke",
          connections: 1,
          revoked: 1,
          unsupported: 0,
          failed: 0,
          no_token: 0,
          failures: {},
          institutions: ["monzo"],
        });
        expect(JSON.stringify(log.mock.calls)).not.toContain(PERSON);
        expect(JSON.stringify(log.mock.calls)).not.toContain("access-1");
      } finally {
        log.mockRestore();
      }
    });

    it("an outage is retried once, audited with its typed code, and never throws", async () => {
      const bank = createFakeBank(monzoCase.routes);
      bank.failAlways("revoke", { kind: "status", status: 503 });
      vi.stubGlobal("fetch", bank.fetch);
      const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
      const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
      try {
        const id = await insertConnection();
        await expect(
          monzoRevoker().revokeAll(PERSON, [{ id, institutionId: "monzo", authType: "oauth" }]),
        ).resolves.toBeUndefined();
        expect(bank.callsTo("revoke").length).toBeGreaterThanOrEqual(2);
        const [event] = auditEvents(log);
        expect(event).toMatchObject({ failed: 1, revoked: 0, failures: { UNAVAILABLE: 1 } });
        expect(JSON.stringify(warn.mock.calls)).not.toContain(PROVIDER_ECHO_MARKER);
      } finally {
        log.mockRestore();
        warn.mockRestore();
      }
    });

    it("a revoked consent (401) is audited as AUTH_EXPIRED without a retry", async () => {
      const bank = createFakeBank(monzoCase.routes);
      bank.failAlways("revoke", { kind: "status", status: 401 });
      vi.stubGlobal("fetch", bank.fetch);
      const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
      try {
        const id = await insertConnection();
        await monzoRevoker().revokeAll(PERSON, [{ id, institutionId: "monzo", authType: "oauth" }]);
        expect(bank.callsTo("revoke")).toHaveLength(1);
        expect(auditEvents(log)[0]).toMatchObject({ failed: 1, failures: { AUTH_EXPIRED: 1 } });
      } finally {
        log.mockRestore();
      }
    });
  });

  describe("OAuth state (M4)", () => {
    it("a state is random, single use and carries a PKCE S256 challenge", async () => {
      const manager = ds.manager;
      const a = await issueOAuthState(manager, {
        userId: PERSON,
        institutionId: "monzo",
        redirectUri: "https://api.test/cb",
      });
      const b = await issueOAuthState(manager, {
        userId: PERSON,
        institutionId: "monzo",
        redirectUri: "https://api.test/cb",
      });
      expect(a.state).not.toEqual(b.state);
      expect(a.state).not.toContain(PERSON);

      const consumed = await consumeOAuthState(manager, a.state, "monzo");
      expect(consumed).toMatchObject({
        userId: PERSON,
        institutionId: "monzo",
        redirectUri: "https://api.test/cb",
      });
      const challenge = createHash("sha256")
        .update(consumed?.codeVerifier as string)
        .digest("base64url");
      expect(challenge).toBe(a.codeChallenge);
      expect(await consumeOAuthState(manager, a.state, "monzo")).toBeNull();
      expect(await consumeOAuthState(manager, b.state, "starling")).toBeNull();
      // Only the hash is stored.
      const rows = await ds.query("SELECT state_hash FROM bank_oauth_states");
      expect(JSON.stringify(rows)).not.toContain(b.state);
    });

    it("an expired state is refused", async () => {
      const issued = await issueOAuthState(ds.manager, {
        userId: PERSON,
        institutionId: "monzo",
        redirectUri: "https://api.test/cb",
        now: new Date(Date.now() - 11 * 60 * 1000),
      });
      expect(await consumeOAuthState(ds.manager, issued.state, "monzo")).toBeNull();
    });

    it("connectBank's OAuth redirect has a random state and PKCE, and needs a configured redirect URI", async () => {
      config.BACKEND_URL = "https://api.test";
      const finance = financeWith(scriptedProvider(() => []));
      const res = (await finance.connectBank(PERSON, { institutionId: "monzo" })) as {
        redirectUrl: string;
      };
      const url = new URL(res.redirectUrl);
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("state")).not.toContain(PERSON);
      expect(url.searchParams.get("redirect_uri")).toBe(
        "https://api.test/bank-connections/callback",
      );

      delete config.BACKEND_URL;
      await expect(finance.connectBank(PERSON, { institutionId: "monzo" })).rejects.toThrow(
        /not configured/,
      );
    });
  });

  describe("snapshot rules (E23 D22, E30), moved from the mock unit suite", () => {
    const at = async <T>(iso: string, work: () => Promise<T>): Promise<T> => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(iso));
      try {
        return await work();
      } finally {
        vi.useRealTimers();
      }
    };
    const details = (accountId: string) =>
      ds.query(
        `SELECT user_id, source, value::float AS value, year, month, as_of_date::text AS as_of_date
         FROM account_details WHERE account_id = $1`,
        [accountId],
      );

    it("tags new rows source=connected with the owner and a London date", async () => {
      const id = await insertConnection();
      await at("2026-03-15T12:00:00Z", () =>
        financeWith(scriptedProvider(() => [account("a", 500)])).syncBankConnection(PERSON, id),
      );
      const [acc] = await accountRows(id);
      expect(await details(acc?.id as string)).toEqual([
        {
          user_id: PERSON,
          source: "connected",
          value: 500,
          year: 2026,
          month: 3,
          as_of_date: "2026-03-15",
        },
      ]);
    });

    it("reads the clock once: at 00:30 BST on the 1st the key and the date agree", async () => {
      const id = await insertConnection();
      await at("2026-06-30T23:30:00Z", () =>
        financeWith(scriptedProvider(() => [account("a", 500)])).syncBankConnection(PERSON, id),
      );
      const [acc] = await accountRows(id);
      expect(await details(acc?.id as string)).toMatchObject([
        { year: 2026, month: 7, as_of_date: "2026-07-01" },
      ]);
    });

    it("sync, a check-in edit and a second sync share one row; a manual value is never overwritten", async () => {
      const id = await insertConnection();
      let balance = 10;
      const finance = financeWith(scriptedProvider(() => [account("a", balance)]));
      await finance.syncBankConnection(PERSON, id);
      const [acc] = await accountRows(id);
      await finance.updateAccount(PERSON, acc?.id as string, { balance: 55 });
      balance = 20;
      await finance.syncBankConnection(PERSON, id);
      expect(await details(acc?.id as string)).toMatchObject([{ source: "manual", value: 55 }]);
      expect(Number((await accountRows(id))[0]?.balance)).toBe(55);
    });

    it("refreshes an existing connected row, the balance and the name", async () => {
      const id = await insertConnection();
      let balance = 1;
      const finance = financeWith(
        scriptedProvider(() => [account("a", balance, { name: balance === 1 ? "Old" : "Bank" })]),
      );
      await finance.syncBankConnection(PERSON, id);
      balance = 500;
      await finance.syncBankConnection(PERSON, id);
      const [acc] = await ds.query(
        "SELECT id, name, balance::float AS balance FROM accounts WHERE connection_id = $1",
        [id],
      );
      expect(acc).toMatchObject({ name: "Bank", balance: 500 });
      expect(await details(acc.id)).toMatchObject([{ source: "connected", value: 500 }]);
    });

    it("stores a liability negative", async () => {
      const id = await insertConnection();
      await financeWith(
        scriptedProvider(() => [account("a", 500, { type: "Credit Card" })]),
      ).syncBankConnection(PERSON, id);
      expect(Number((await accountRows(id))[0]?.balance)).toBe(-500);
    });
  });

  describe("responses never carry tokens or provider text", () => {
    const TOKEN_FIELDS = ["accessToken", "refreshToken", "userId", "syncStartedAt"];

    it("connect (token) and sync responses have only public fields", async () => {
      const finance = financeWith(scriptedProvider(() => [account("a", 1)]));
      const connected = (await finance.connectBank(PERSON, {
        institutionId: "monzo",
        token: "pat",
      })) as unknown as {
        connection: Record<string, unknown>;
      };
      for (const field of TOKEN_FIELDS)
        expect(Object.keys(connected.connection)).not.toContain(field);
      const synced = (await finance.syncBankConnection(
        PERSON,
        connected.connection.id as string,
      )) as unknown as {
        connection: Record<string, unknown>;
      };
      for (const field of TOKEN_FIELDS) expect(Object.keys(synced.connection)).not.toContain(field);
    });

    it("a failed token connect hides provider text and saves status error", async () => {
      const provider = scriptedProvider(() => {
        throw new Error("Bearer abc123 rejected");
      });
      const error = await financeWith(provider)
        .connectBank(PERSON, { institutionId: "monzo", token: "pat" })
        .catch((e: Error) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain("abc123");
      const [row] = await ds.getRepository(BankConnection).findBy({ userId: PERSON });
      expect(row?.status).toBe("error");
    });
  });

  describe("privacy (E19 A5, E19 D8-A)", () => {
    it("a failed token sync logs neither the token nor the provider body", async () => {
      const logged = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
      try {
        const provider = scriptedProvider(() => {
          throw new Error(
            'Failed to fetch Starling accounts: {"balance":987654,"token":"tok-secret-xyz"}',
          );
        });
        await financeWith(provider)
          .connectBank(PERSON, { institutionId: "starling", token: "tok-secret-xyz" })
          .catch(() => undefined);
        const output = JSON.stringify(logged.mock.calls);
        expect(output).toContain("Failed to fetch Starling accounts");
        expect(output).not.toContain("tok-secret-xyz");
        expect(output).not.toContain("987654");
      } finally {
        logged.mockRestore();
      }
    });

    it("bank sync stores no transactions", async () => {
      const provider = scriptedProvider(() => [account("a", 1)]);
      await financeWith(provider).connectBank(PERSON, { institutionId: "monzo", token: "pat" });
      expect(provider.fetchTransactions).not.toHaveBeenCalled();
      expect(Number((await ds.query("SELECT count(*)::int AS n FROM transactions"))[0].n)).toBe(0);
    });
  });

  describe("authz", () => {
    it("another user cannot sync or delete a connection, which stays unchanged", async () => {
      const id = await insertConnection();
      const provider = scriptedProvider(() => [account("a", 1)]);
      const finance = financeWith(provider);
      await expect(finance.syncBankConnection(OTHER_PERSON, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(finance.deleteBankConnection(OTHER_PERSON, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(provider.fetchAccounts).not.toHaveBeenCalled();
      expect(provider.revokeConnection).not.toHaveBeenCalled();
      expect(await ds.getRepository(BankConnection).countBy({ id })).toBe(1);
    });

    it("the token flow syncs, and a second connect for the same bank reuses the connection", async () => {
      const finance = financeWith(scriptedProvider(() => [account("a", 10)]));
      const first = (await finance.connectBank(PERSON, {
        institutionId: "monzo",
        token: "pat-1",
      })) as {
        connection: { id: string };
      };
      const second = (await finance.connectBank(PERSON, {
        institutionId: "monzo",
        token: "pat-2",
      })) as {
        connection: { id: string };
      };
      expect(second.connection.id).toBe(first.connection.id);
      const row = await connectionRow(first.connection.id);
      expect(
        BankSyncOrchestrator.decryptToken(row.accessToken as string, accessTokenAad(row.id)),
      ).toBe("pat-2");
      expect((await accountRows(row.id)).length).toBe(1);
    });
  });
});
