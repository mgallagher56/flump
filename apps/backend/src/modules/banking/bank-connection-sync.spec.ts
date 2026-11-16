import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { BankAuthExpiredError, BankSyncOrchestrator } from "@flump/banking/server";
import type { DataSource } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BankConnection } from "../../entities/bank-connection.entity";
import {
  accessTokenAad,
  BankConnectionSync,
  ConnectionNeedsReconnectError,
  refreshTokenAad,
} from "./bank-connection-sync";
import type { BankProvider } from "./providers/provider.interface";

const TEST_KEY = "k".repeat(40);
const CONN_ID = "11111111-1111-4111-8111-111111111111";

function legacyEncrypt(plaintext: string, secret: string): string {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const ct = cipher.update(plaintext, "utf8", "hex") + cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ct}`;
}

function makeProvider(
  refreshImpl: BankProvider["refreshToken"] = async () => ({
    accessToken: "access-refreshed",
    refreshToken: "refresh-refreshed",
    expiresIn: 3600,
  }),
) {
  return {
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
    refreshToken: vi.fn(refreshImpl),
    revokeConnection: vi.fn(),
    fetchAccounts: vi.fn(),
    fetchTransactions: vi.fn(),
  };
}

describe("BankConnectionSync.activeAccessToken (N7 / S11, S4, database-free)", () => {
  const savedKey = process.env.BANKING_TOKEN_ENCRYPTION_KEY;
  const savedKeys = process.env.BANKING_TOKEN_ENCRYPTION_KEYS;

  beforeEach(() => {
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = TEST_KEY;
    delete process.env.BANKING_TOKEN_ENCRYPTION_KEYS;
  });

  afterEach(() => {
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = savedKey;
    if (savedKeys === undefined) delete process.env.BANKING_TOKEN_ENCRYPTION_KEYS;
    else process.env.BANKING_TOKEN_ENCRYPTION_KEYS = savedKeys;
  });

  it("calls provider.refreshToken outside transaction() without holding a row lock, then persists with CAS (N7 / S11)", async () => {
    const events: string[] = [];
    const oldAccessCipher = BankSyncOrchestrator.encryptToken(
      "access-old",
      accessTokenAad(CONN_ID),
    );
    const oldRefreshCipher = BankSyncOrchestrator.encryptToken(
      "refresh-old",
      refreshTokenAad(CONN_ID),
    );

    let storedRow: Partial<BankConnection> = {
      id: CONN_ID,
      accessToken: oldAccessCipher,
      refreshToken: oldRefreshCipher,
      expiresAt: new Date(Date.now() - 60_000),
    };

    const findOne = vi.fn(async (opts: { lock?: unknown }) => {
      events.push(opts?.lock ? "db:findOne:locked" : "db:findOne:unlocked");
      return storedRow;
    });
    const query = vi.fn(async (sql: string, params: unknown[]) => {
      events.push("db:casUpdate");
      expect(sql).toContain('UPDATE "bank_connections"');
      expect(sql).toContain('AND "access_token" = $5');
      expect(sql).toContain('AND "refresh_token" IS NOT DISTINCT FROM $6');
      expect(params[3]).toBe(CONN_ID);
      expect(params[4]).toBe(oldAccessCipher);
      expect(params[5]).toBe(oldRefreshCipher);
      storedRow = {
        ...storedRow,
        accessToken: params[0] as string,
        refreshToken: params[1] as string | null,
        expiresAt: params[2] as Date | null,
      };
      return [[{ id: CONN_ID }], 1];
    });
    const transaction = vi.fn(async () => {
      events.push("db:transaction");
      throw new Error("transaction() must not be called during token refresh");
    });

    const ds = {
      getRepository: () => ({ findOne }),
      query,
      transaction,
    } as unknown as DataSource;

    const provider = makeProvider(async () => {
      events.push("http:refreshToken");
      // While the external HTTP call is in flight, no transaction or CAS update has occurred.
      expect(transaction).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
      return {
        accessToken: "access-new",
        refreshToken: "refresh-new",
        expiresIn: 3600,
      };
    });

    const sync = new BankConnectionSync(ds);
    const token = await sync.activeAccessToken(CONN_ID, provider, {
      clientId: "cid",
      clientSecret: "csecret",
    });

    expect(token).toBe("access-new");
    expect(transaction).not.toHaveBeenCalled();
    expect(events).toEqual(["db:findOne:unlocked", "http:refreshToken", "db:casUpdate"]);
    expect(
      BankSyncOrchestrator.decryptToken(storedRow.accessToken as string, accessTokenAad(CONN_ID)),
    ).toBe("access-new");
    expect(
      BankSyncOrchestrator.decryptToken(storedRow.refreshToken as string, refreshTokenAad(CONN_ID)),
    ).toBe("refresh-new");
  });

  it("coalesces concurrent refreshes on the same instance so provider.refreshToken runs once", async () => {
    const oldAccessCipher = BankSyncOrchestrator.encryptToken(
      "access-old",
      accessTokenAad(CONN_ID),
    );
    const oldRefreshCipher = BankSyncOrchestrator.encryptToken(
      "refresh-old",
      refreshTokenAad(CONN_ID),
    );
    const findOne = vi.fn(async () => ({
      id: CONN_ID,
      accessToken: oldAccessCipher,
      refreshToken: oldRefreshCipher,
      expiresAt: new Date(Date.now() - 60_000),
    }));
    const query = vi.fn(async () => [[{ id: CONN_ID }], 1]);
    const transaction = vi.fn();

    const ds = {
      getRepository: () => ({ findOne }),
      query,
      transaction,
    } as unknown as DataSource;

    const provider = makeProvider();
    const sync = new BankConnectionSync(ds);
    const creds = { clientId: "cid", clientSecret: "csecret" };

    const [a, b] = await Promise.all([
      sync.activeAccessToken(CONN_ID, provider, creds),
      sync.activeAccessToken(CONN_ID, provider, creds),
    ]);

    expect(a).toBe("access-refreshed");
    expect(b).toBe("access-refreshed");
    expect(provider.refreshToken).toHaveBeenCalledTimes(1);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("re-reads the winner's token when a concurrent process wins the compare-and-swap update", async () => {
    const oldAccessCipher = BankSyncOrchestrator.encryptToken(
      "access-old",
      accessTokenAad(CONN_ID),
    );
    const oldRefreshCipher = BankSyncOrchestrator.encryptToken(
      "refresh-old",
      refreshTokenAad(CONN_ID),
    );
    const winnerAccessCipher = BankSyncOrchestrator.encryptToken(
      "access-from-winner",
      accessTokenAad(CONN_ID),
    );

    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        id: CONN_ID,
        accessToken: oldAccessCipher,
        refreshToken: oldRefreshCipher,
        expiresAt: new Date(Date.now() - 60_000),
      })
      .mockResolvedValueOnce({
        id: CONN_ID,
        accessToken: winnerAccessCipher,
        refreshToken: oldRefreshCipher,
        expiresAt: new Date(Date.now() + 3600_000),
      });
    // CAS update returns 0 rows because another process already rotated the ciphertext.
    const query = vi.fn(async () => [[], 0]);
    const transaction = vi.fn();

    const ds = {
      getRepository: () => ({ findOne }),
      query,
      transaction,
    } as unknown as DataSource;

    const provider = makeProvider(async () => ({
      accessToken: "access-from-loser",
      refreshToken: "refresh-from-loser",
      expiresIn: 3600,
    }));

    const sync = new BankConnectionSync(ds);
    const result = await sync.activeAccessToken(CONN_ID, provider, {
      clientId: "cid",
      clientSecret: "csecret",
    });

    expect(result).toBe("access-from-winner");
    expect(findOne).toHaveBeenCalledTimes(2);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses unprefixed legacy tokens with ConnectionNeedsReconnectError (S4)", async () => {
    const findOne = vi.fn(async () => ({
      id: CONN_ID,
      accessToken: legacyEncrypt("legacy-access", TEST_KEY),
      refreshToken: null,
      expiresAt: new Date(Date.now() + 3600_000),
    }));
    const ds = {
      getRepository: () => ({ findOne }),
      query: vi.fn(),
      transaction: vi.fn(),
    } as unknown as DataSource;

    const provider = makeProvider();
    const sync = new BankConnectionSync(ds);
    await expect(
      sync.activeAccessToken(CONN_ID, provider, { clientId: "cid", clientSecret: "csecret" }),
    ).rejects.toBeInstanceOf(ConnectionNeedsReconnectError);
    expect(provider.refreshToken).not.toHaveBeenCalled();
  });

  it("retries CAS when M11 lazy re-encryption rewrites ciphertext during an in-flight refresh", async () => {
    const expiredAt = new Date(Date.now() - 60_000);
    const v1Access = BankSyncOrchestrator.encryptToken("access-old", accessTokenAad(CONN_ID));
    const v1Refresh = BankSyncOrchestrator.encryptToken("refresh-old", refreshTokenAad(CONN_ID));

    process.env.BANKING_TOKEN_ENCRYPTION_KEYS = `2:${"n".repeat(40)},1:${TEST_KEY}`;
    const v2Access = BankSyncOrchestrator.encryptToken("access-old", accessTokenAad(CONN_ID));
    const v2Refresh = BankSyncOrchestrator.encryptToken("refresh-old", refreshTokenAad(CONN_ID));

    let currentRow: Partial<BankConnection> = {
      id: CONN_ID,
      accessToken: v1Access,
      refreshToken: v1Refresh,
      expiresAt: expiredAt,
    };

    const findOne = vi.fn(async () => currentRow);
    const query = vi.fn(async (_sql: string, params: unknown[]) => {
      const [nextAccess, nextRefresh, nextExpires, _id, expectedAccess, expectedRefresh] = params;
      if (
        expectedAccess === currentRow.accessToken &&
        expectedRefresh === currentRow.refreshToken
      ) {
        currentRow = {
          ...currentRow,
          accessToken: nextAccess as string,
          refreshToken: nextRefresh as string | null,
          expiresAt: nextExpires as Date | null,
        };
        return [[{ id: CONN_ID }], 1];
      }
      return [[], 0];
    });

    const ds = {
      getRepository: () => ({ findOne }),
      query,
      transaction: vi.fn(),
    } as unknown as DataSource;

    const provider = makeProvider(async () => {
      // Simulate concurrent M11 lazy re-encryption moving v1 -> v2 while HTTP refresh is in flight.
      currentRow = {
        ...currentRow,
        accessToken: v2Access,
        refreshToken: v2Refresh,
      };
      return {
        accessToken: "access-new",
        refreshToken: "refresh-new",
        expiresIn: 3600,
      };
    });

    const sync = new BankConnectionSync(ds);
    const token = await sync.activeAccessToken(CONN_ID, provider, {
      clientId: "cid",
      clientSecret: "csecret",
    });

    expect(token).toBe("access-new");
    expect(query).toHaveBeenCalledTimes(2);
    expect(
      BankSyncOrchestrator.decryptToken(currentRow.accessToken as string, accessTokenAad(CONN_ID)),
    ).toBe("access-new");
    expect(
      BankSyncOrchestrator.decryptToken(
        currentRow.refreshToken as string,
        refreshTokenAad(CONN_ID),
      ),
    ).toBe("refresh-new");
  });

  it("coalesces concurrent refreshes across separate BankConnectionSync instances sharing a DataSource", async () => {
    const oldAccessCipher = BankSyncOrchestrator.encryptToken(
      "access-old",
      accessTokenAad(CONN_ID),
    );
    const oldRefreshCipher = BankSyncOrchestrator.encryptToken(
      "refresh-old",
      refreshTokenAad(CONN_ID),
    );
    const ds = {
      getRepository: () => ({
        findOne: vi.fn(async () => ({
          id: CONN_ID,
          accessToken: oldAccessCipher,
          refreshToken: oldRefreshCipher,
          expiresAt: new Date(Date.now() - 60_000),
        })),
      }),
      query: vi.fn(async () => [[{ id: CONN_ID }], 1]),
      transaction: vi.fn(),
    } as unknown as DataSource;

    const provider = makeProvider();
    const syncA = new BankConnectionSync(ds);
    const syncB = new BankConnectionSync(ds);
    const creds = { clientId: "cid", clientSecret: "csecret" };

    const [a, b] = await Promise.all([
      syncA.activeAccessToken(CONN_ID, provider, creds),
      syncB.activeAccessToken(CONN_ID, provider, creds),
    ]);

    expect(a).toBe("access-refreshed");
    expect(b).toBe("access-refreshed");
    expect(provider.refreshToken).toHaveBeenCalledTimes(1);
  });

  it("recovers the winner's fresh token when a strict provider rejects a concurrent refresh with AUTH_EXPIRED", async () => {
    const oldAccessCipher = BankSyncOrchestrator.encryptToken(
      "access-old",
      accessTokenAad(CONN_ID),
    );
    const oldRefreshCipher = BankSyncOrchestrator.encryptToken(
      "refresh-old",
      refreshTokenAad(CONN_ID),
    );
    const winnerAccessCipher = BankSyncOrchestrator.encryptToken(
      "access-winner",
      accessTokenAad(CONN_ID),
    );
    const winnerRefreshCipher = BankSyncOrchestrator.encryptToken(
      "refresh-winner",
      refreshTokenAad(CONN_ID),
    );

    let sharedRow: Partial<BankConnection> = {
      id: CONN_ID,
      accessToken: oldAccessCipher,
      refreshToken: oldRefreshCipher,
      expiresAt: new Date(Date.now() - 60_000),
    };

    const ds = {
      getRepository: () => ({ findOne: vi.fn(async () => sharedRow) }),
      query: vi.fn(),
      transaction: vi.fn(),
    } as unknown as DataSource;

    const provider = makeProvider(async () => {
      // Simulate another process finishing its refresh and committing before our strict provider call fails.
      sharedRow = {
        id: CONN_ID,
        accessToken: winnerAccessCipher,
        refreshToken: winnerRefreshCipher,
        expiresAt: new Date(Date.now() + 3600_000),
      };
      throw new BankAuthExpiredError({
        provider: "monzo",
        operation: "refresh token",
        status: 401,
      });
    });

    const sync = new BankConnectionSync(ds);
    const token = await sync.activeAccessToken(CONN_ID, provider, {
      clientId: "cid",
      clientSecret: "csecret",
    });

    expect(token).toBe("access-winner");
  });
});
