import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCursor } from "../../contract/pagination";
import { financeServiceWithIntake } from "../../testing/finance-service";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { ConnectionNeedsReconnectError, type SyncOutcome } from "../banking/bank-connection-sync";

/**
 * The bank sync itself (lease, token refresh, account writes) is BankConnectionSync's job and has
 * its own specs. Here it is a fake, so these tests cover what FinanceService does with its result:
 * the status it records, the response and the messages.
 */
type FakeSync = {
  claim: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  activeAccessToken: ReturnType<typeof vi.fn>;
  writeAccounts: ReturnType<typeof vi.fn>;
  deleteConnectionData: ReturnType<typeof vi.fn>;
};
const syncRef = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("../banking/bank-connection-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../banking/bank-connection-sync")>();
  return {
    ...actual,
    BankConnectionSync: function FakeBankConnectionSync() {
      return syncRef.current;
    },
  };
});

const USER_A = "6f1c6a4e-5b0e-4a63-9d0a-0000000000a1";
const USER_B = "6f1c6a4e-5b0e-4a63-9d0a-0000000000b1";
const CONN_A = "6f1c6a4e-5b0e-4a63-9d0a-00000000c0a1";
const CONN_B = "6f1c6a4e-5b0e-4a63-9d0a-00000000c0b1";
const NOW = new Date("2026-11-20T10:00:00.000Z");

const connectionRow = (over: Record<string, unknown> = {}) => ({
  id: CONN_A,
  userId: USER_A,
  institutionId: "monzo",
  institutionName: "Monzo Bank",
  status: "error",
  authType: "oauth",
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  lastSyncedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...over,
});

const setup = (
  opts: {
    rows?: Record<string, unknown>[];
    config?: Record<string, string>;
    outcome?: SyncOutcome;
    hasProvider?: boolean;
  } = {},
) => {
  const bankRepo = createInMemoryRepository(opts.rows ?? []);
  const auditInsert = vi.fn().mockResolvedValue(undefined);
  const consentInsert = vi.fn().mockResolvedValue(undefined);
  // The token flow's INSERT ... ON CONFLICT: reuses the caller's row for the bank, or adds one.
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (!sql.includes("bank_connections")) return [];
    const [userId, institutionId, institutionName] = params as string[];
    const existing = bankRepo.rows.find(
      (r) => r.userId === userId && r.institutionId === institutionId,
    );
    if (existing) return [{ id: existing.id }];
    bankRepo.rows.push(
      connectionRow({ id: CONN_A, userId, institutionId, institutionName, status: "connected" }),
    );
    return [{ id: CONN_A }];
  });
  const em = {
    query,
    getRepository: (entity: { name: string }) =>
      ({
        BankConnection: bankRepo,
        AuditEvent: { insert: auditInsert },
        Consent: { count: vi.fn().mockResolvedValue(0), insert: consentInsert },
      })[entity.name],
  };
  Object.assign(bankRepo, {
    findOneOrFail: async (o: { where: Record<string, unknown> }) => {
      const row = await bankRepo.findOne(o);
      if (!row) throw new Error("not found");
      return row;
    },
    manager: {
      query,
      connection: {},
      transaction: <R>(work: (m: typeof em) => Promise<R>) => work(em),
    },
  });
  const sync: FakeSync = {
    claim: vi.fn().mockResolvedValue("lease-1"),
    release: vi.fn().mockResolvedValue(undefined),
    activeAccessToken: vi.fn().mockResolvedValue("access"),
    writeAccounts: vi.fn().mockResolvedValue(opts.outcome ?? { total: 1, updated: 1, skipped: 0 }),
    deleteConnectionData: vi.fn(),
  };
  syncRef.current = sync;
  const provider = {
    fetchAccounts: vi.fn().mockResolvedValue([]),
    getAuthUrl: vi.fn(
      (_clientId: string, _redirectUri: string, state: string) =>
        `https://bank.example.test/auth?state=${state}`,
    ),
  };
  const registry = {
    getProvider: vi.fn(() => (opts.hasProvider === false ? undefined : provider)),
  };
  const config = { get: vi.fn((key: string) => opts.config?.[key]) };
  const service = financeServiceWithIntake({}, {}, bankRepo, {}, registry, config);
  return { service, bankRepo, sync, provider, auditInsert, consentInsert, query };
};

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("FinanceService bank connections", () => {
  describe("listBankConnections", () => {
    it("lists only the caller's connections", async () => {
      const { service } = setup({
        rows: [connectionRow(), connectionRow({ id: CONN_B, userId: USER_B })],
      });
      const page = await service.listBankConnections(USER_A, { limit: 10 });
      expect(page.items.map((c) => c.id)).toEqual([CONN_A]);
    });

    it("accepts a next-page cursor of the connection keys (created time, then id)", async () => {
      const { service } = setup({ rows: [connectionRow()] });
      // The connection list pages newest first by created_at, then id: a cursor holds a
      // microsecond UTC timestamp and a uuid, in that order.
      const cursor = encodeCursor(["2026-11-01T09:30:00.123456", CONN_B]);
      await expect(
        service.listBankConnections(USER_A, { limit: 10, cursor }),
      ).resolves.toMatchObject({ nextCursor: null });
      // A cursor with the keys the other way round is not one of this list's.
      const swapped = encodeCursor([CONN_B, "2026-11-01T09:30:00.123456"]);
      await expect(
        service.listBankConnections(USER_A, { limit: 10, cursor: swapped }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("connectBank with a personal access token", () => {
    it("stores the bank's display name, the token auth type, the audit row and the consent", async () => {
      // An earlier OAuth attempt left a row for this bank: the token connect reuses it.
      const { service, bankRepo, auditInsert, consentInsert, query } = setup({
        rows: [connectionRow({ authType: "oauth" })],
      });

      const result = await service.connectBank(USER_A, { institutionId: "monzo", token: "t" });

      expect(query.mock.calls[0]?.[1]).toEqual([USER_A, "monzo", "Monzo Bank"]);
      expect(bankRepo.rows[0]).toMatchObject({ authType: "token", status: "connected" });
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_A,
          action: "bank_connection.connected",
          targetId: CONN_A,
          metadata: { institutionId: "monzo", authType: "token" },
        }),
      );
      // The consent names what was agreed to: this bank, by token.
      expect(consentInsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_A, kind: "bank_access", version: "monzo:token" }),
      );
      expect(result).toMatchObject({
        success: true,
        message: expect.stringMatching(/\b1 account\b(?!s)/),
      });
      expect(result).toHaveProperty("connection.id", CONN_A);
    });

    it("is a 409 when a sync of the connection is already running", async () => {
      const { service, sync } = setup();
      sync.claim.mockResolvedValue(null);
      await expect(
        service.connectBank(USER_A, { institutionId: "monzo", token: "t" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("is a 400 when the first sync cannot read any account with the token", async () => {
      // 2 accounts seen, 0 read: the token did not work.
      const { service } = setup({ outcome: { total: 2, updated: 0, skipped: 2 } });
      await expect(
        service.connectBank(USER_A, { institutionId: "monzo", token: "t" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("connectBank by OAuth", () => {
    const creds = { MONZO_CLIENT_ID: "id", MONZO_CLIENT_SECRET: "secret" };

    it("redirects with the bank's own redirect URI when one is configured", async () => {
      const { service, provider } = setup({
        config: {
          ...creds,
          MONZO_REDIRECT_URI: "https://app.example.test/monzo/callback",
          BACKEND_URL: "https://api.example.test",
        },
      });
      const result = await service.connectBank(USER_A, { institutionId: "monzo" });
      expect(provider.getAuthUrl).toHaveBeenCalledWith(
        "id",
        "https://app.example.test/monzo/callback",
        expect.any(String),
      );
      expect(result).toMatchObject({ success: true, oauth: true });
      expect(result).toHaveProperty("redirectUrl", expect.stringMatching(/^https:\/\/bank\./));
    });

    it("falls back to the backend's callback, with any trailing slashes removed", async () => {
      const { service, provider } = setup({
        config: { ...creds, BACKEND_URL: "https://api.example.test//" },
      });
      await service.connectBank(USER_A, { institutionId: "monzo" });
      expect(provider.getAuthUrl).toHaveBeenCalledWith(
        "id",
        "https://api.example.test/bank-connections/callback",
        expect.any(String),
      );
    });

    it("is a 503 when no redirect URI can be built", async () => {
      const { service } = setup({ config: creds });
      await expect(service.connectBank(USER_A, { institutionId: "monzo" })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it("is a 400 naming both settings when only the client id is configured", async () => {
      const { service, provider } = setup({
        config: { MONZO_CLIENT_ID: "id", BACKEND_URL: "https://api.example.test" },
      });
      const attempt = service.connectBank(USER_A, { institutionId: "monzo" });
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow(/MONZO_CLIENT_ID and MONZO_CLIENT_SECRET/);
      expect(provider.getAuthUrl).not.toHaveBeenCalled();
    });

    it.each([
      ["starling", "Starling"],
      ["trading212", "Trading 212"],
    ])("names %s by its bank name when it cannot connect", async (institutionId, name) => {
      // The error says which bank is not set up, by its name, not its id.
      const { service } = setup();
      await expect(service.connectBank(USER_A, { institutionId })).rejects.toThrow(name);
    });
  });

  describe("syncBankConnection", () => {
    it("is a 404 for another user's connection and runs no sync", async () => {
      const { service, sync } = setup({ rows: [connectionRow({ userId: USER_B })] });
      await expect(service.syncBankConnection(USER_A, CONN_A)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(sync.claim).not.toHaveBeenCalled();
    });

    it("is a 400 when the connection's bank has no provider", async () => {
      const { service, sync } = setup({ rows: [connectionRow()], hasProvider: false });
      await expect(service.syncBankConnection(USER_A, CONN_A)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(sync.claim).not.toHaveBeenCalled();
    });

    it("records a sync that read every account as connected, with the time", async () => {
      const { service, bankRepo, sync } = setup({ rows: [connectionRow({ status: "error" })] });
      const result = await service.syncBankConnection(USER_A, CONN_A);
      expect(bankRepo.rows[0]).toMatchObject({ status: "connected", lastSyncedAt: NOW });
      expect(result).toMatchObject({
        success: true,
        message: expect.stringMatching(/\b1 account\b(?!s)/),
        accounts: { updated: 1, skipped: 0 },
      });
      expect(sync.release).toHaveBeenCalledWith(CONN_A, "lease-1");
    });

    it("counts a bank with no accounts as connected, not failed", async () => {
      // 0 accounts seen and 0 read: nothing failed.
      const { service, bankRepo } = setup({
        rows: [connectionRow()],
        outcome: { total: 0, updated: 0, skipped: 0 },
      });
      const result = await service.syncBankConnection(USER_A, CONN_A);
      expect(bankRepo.rows[0]).toMatchObject({ status: "connected" });
      expect(result).toMatchObject({
        success: true,
        message: expect.stringMatching(/\b0 accounts\b/),
      });
    });

    it("records a sync that read none of the accounts as an error", async () => {
      // 2 accounts seen, 0 read.
      const { service, bankRepo } = setup({
        rows: [connectionRow({ status: "connected" })],
        outcome: { total: 2, updated: 0, skipped: 2 },
      });
      const result = await service.syncBankConnection(USER_A, CONN_A);
      expect(bankRepo.rows[0]).toMatchObject({ status: "error", lastSyncedAt: null });
      expect(result).toMatchObject({ success: false });
      expect(result).not.toHaveProperty("accounts");
    });

    it("says which accounts were read when some could not be", async () => {
      // 3 accounts seen, 2 read, 1 skipped: plural noun, and the partial wording.
      const { service } = setup({
        rows: [connectionRow()],
        outcome: { total: 3, updated: 2, skipped: 1 },
      });
      const result = await service.syncBankConnection(USER_A, CONN_A);
      expect(result).toMatchObject({
        success: true,
        message: expect.stringMatching(/\b2 of 3 accounts\b/),
        accounts: { updated: 2, skipped: 1 },
      });
    });

    it("uses the plural for two accounts all read", async () => {
      const { service } = setup({
        rows: [connectionRow()],
        outcome: { total: 2, updated: 2, skipped: 0 },
      });
      const result = await service.syncBankConnection(USER_A, CONN_A);
      // All read: the message gives the count and says nothing about accounts left unread.
      expect(result).toMatchObject({ message: expect.stringMatching(/\b2 accounts\b/) });
      expect((result as { message: string }).message).not.toMatch(/ of 2 /);
    });

    it("asks for a reconnect when the bank's consent has expired", async () => {
      const { service, bankRepo, sync } = setup({ rows: [connectionRow({ status: "connected" })] });
      sync.activeAccessToken.mockRejectedValue(new ConnectionNeedsReconnectError("expired"));
      const result = await service.syncBankConnection(USER_A, CONN_A);
      expect(bankRepo.rows[0]).toMatchObject({ status: "needs_reconnect" });
      expect(result).toMatchObject({ success: false, error: expect.stringMatching(/reconnected/) });
    });
  });
});
