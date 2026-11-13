import { BankSyncOrchestrator, encryptBankingToken } from "@flump/banking/server";
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FinanceService } from "./finance.service";
import { londonDate } from "./snapshots/london-date";
import { createInMemoryRepository } from "./testing/in-memory-repository";

const createService = () => {
  const accountRepo = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const transactionRepo = {
    create: vi.fn((data) => ({ ...data })),
    save: vi.fn((data) => Promise.resolve(data)),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const accountDetailRepo = {
    find: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const service = new FinanceService(
    accountRepo as any,
    transactionRepo as any,
    accountDetailRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, accountRepo, transactionRepo, accountDetailRepo };
};

describe("FinanceService", () => {
  describe("syncProviderAccounts fallback ids", () => {
    it("gives repository-less accounts unpredictable, unique ids (not Math.random)", async () => {
      const saved: any[] = [];
      const accountRepo = {
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn((a) => {
          saved.push(a);
          return Promise.resolve(a);
        }),
      };
      const provider = {
        fetchAccounts: vi.fn().mockResolvedValue([
          { externalAccountId: "e1", name: "A", type: "current", balance: 1, currency: "GBP" },
          { externalAccountId: "e2", name: "B", type: "current", balance: 2, currency: "GBP" },
        ]),
      };
      const service = new FinanceService(
        accountRepo as any,
        {} as any,
        { upsert: vi.fn() } as any,
        {} as any,
        {} as any,
        { getProvider: vi.fn().mockReturnValue(provider) } as any,
        { get: vi.fn() } as any,
      );

      await service.syncProviderAccounts({ id: "c1", institutionId: "monzo" } as any, "u1", "tok");

      const uuid = /^acc-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(saved).toHaveLength(2);
      for (const a of saved) expect(a.id).toMatch(uuid);
      expect(saved[0].id).not.toBe(saved[1].id);
    });
  });

  describe("sync and check-in share one history row per UK month (E23 D22)", () => {
    const run = async (iso: string) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(iso));
      try {
        const accounts = createInMemoryRepository();
        const details = createInMemoryRepository();
        const provider = {
          fetchAccounts: vi
            .fn()
            .mockResolvedValue([
              { externalAccountId: "e1", name: "A", type: "Current", balance: 10, currency: "GBP" },
            ]),
        };
        const service = new FinanceService(
          accounts as any,
          {} as any,
          details as any,
          {} as any,
          {} as any,
          { getProvider: vi.fn().mockReturnValue(provider) } as any,
          { get: vi.fn() } as any,
        );
        const conn = { id: "c1", institutionId: "monzo" } as any;
        await service.syncProviderAccounts(conn, "u1", "tok");
        const id = accounts.rows[0]?.id as string;
        await service.updateAccount("u1", id, { balance: 55 });
        await service.syncProviderAccounts(conn, "u1", "tok");
        return details.rows;
      } finally {
        vi.useRealTimers();
      }
    };

    it("writes one row for sync, check-in edit and a second sync in the same month", async () => {
      const rows = await run("2026-03-15T12:00:00Z");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ year: 2026, month: 3 });
    });

    it("uses the UK month at 00:30 BST on the 1st (still June in UTC)", async () => {
      const rows = await run("2026-06-30T23:30:00Z");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ year: 2026, month: 7 });
    });
  });

  describe("syncProviderAccounts snapshots (E30)", () => {
    const run = async (
      opts: {
        detail?: Record<string, unknown>;
        account?: Record<string, unknown>;
        type?: string;
      } = {},
      iso = "2026-03-15T12:00:00Z",
    ) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(iso));
      try {
        const accounts = createInMemoryRepository(
          opts.account
            ? [
                {
                  id: "acc-1",
                  userId: "u1",
                  connectionId: "c1",
                  externalAccountId: "e1",
                  ...opts.account,
                },
              ]
            : [],
        );
        const details = createInMemoryRepository(
          opts.detail ? [{ accountId: "acc-1", ...opts.detail }] : [],
        );
        const provider = {
          fetchAccounts: vi.fn().mockResolvedValue([
            {
              externalAccountId: "e1",
              name: "Bank",
              type: opts.type ?? "Current",
              balance: 500,
              currency: "GBP",
            },
          ]),
        };
        const service = new FinanceService(
          accounts as any,
          {} as any,
          details as any,
          {} as any,
          {} as any,
          { getProvider: vi.fn().mockReturnValue(provider) } as any,
          { get: vi.fn() } as any,
        );
        await service.syncProviderAccounts(
          { id: "c1", institutionId: "monzo" } as any,
          "u1",
          "tok",
        );
        return { accounts: accounts.rows, details: details.rows };
      } finally {
        vi.useRealTimers();
      }
    };

    it("tags new rows source=connected with the owner and a London date", async () => {
      const { details } = await run();
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({
        userId: "u1",
        source: "connected",
        value: 500,
        year: 2026,
        month: 3,
        asOfDate: "2026-03-15",
      });
    });

    it("refreshes an existing connected row and the balance", async () => {
      const { details, accounts } = await run({
        detail: { source: "connected", value: 1, year: 2026, month: 3, asOfDate: "2026-03-01" },
        account: { balance: 1, name: "Old", type: "Current" },
      });
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({ source: "connected", value: 500, asOfDate: "2026-03-15" });
      expect(accounts[0]).toMatchObject({ balance: 500, name: "Bank" });
    });

    it("never overwrites a manual value for the month, nor the account balance it mirrors", async () => {
      const { details, accounts } = await run({
        detail: { source: "manual", value: 123, year: 2026, month: 3, asOfDate: "2026-03-10" },
        account: { balance: 123, name: "Old", type: "Current" },
      });
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({ source: "manual", value: 123 });
      expect(accounts[0]).toMatchObject({ balance: 123, name: "Bank" });
    });

    it("stores a liability negative", async () => {
      const { details } = await run({ type: "Credit Card" });
      expect(details[0]?.value).toBe(-500);
    });

    it("reads the clock once: at 00:30 BST on the 1st the key and the date agree", async () => {
      const { details } = await run({}, "2026-06-30T23:30:00Z");
      expect(details[0]).toMatchObject({ year: 2026, month: 7, asOfDate: "2026-07-01" });
    });
  });

  describe("deleteAccount", () => {
    it("does not delete transactions for an account the caller does not own", async () => {
      const { service, accountRepo, transactionRepo } = createService();
      accountRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount("userB", "account-of-userA")).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(accountRepo.findOne).toHaveBeenCalledWith({
        where: { id: "account-of-userA", userId: "userB" },
      });
      expect(transactionRepo.delete).not.toHaveBeenCalled();
    });

    it("deletes transactions after confirming the caller owns the account", async () => {
      const { service, accountRepo, transactionRepo } = createService();
      accountRepo.findOne.mockResolvedValue({ id: "acc-1", userId: "userA", balance: "0" });

      const result = await service.deleteAccount("userA", "acc-1");

      expect(result).toEqual({ success: true });
      expect(transactionRepo.delete).toHaveBeenCalledTimes(1);
      expect(transactionRepo.delete).toHaveBeenCalledWith({ accountId: "acc-1" });
      expect(accountRepo.findOne.mock.invocationCallOrder[0]).toBeLessThan(
        transactionRepo.delete.mock.invocationCallOrder[0],
      );
    });
  });
  describe("createTransaction", () => {
    it("saves with the caller's userId and ignores client-supplied id and userId", async () => {
      const { service, transactionRepo, accountRepo } = createService();
      accountRepo.findOne.mockResolvedValue({ id: "acc-1", userId: "userA" });

      await service.createTransaction("userA", {
        id: "other-id",
        userId: "userB",
        accountId: "acc-1",
        amount: -5,
        description: "Coffee",
        category: "Food",
        timestamp: "2026-01-01T10:00:00Z",
      } as any);

      const created = transactionRepo.create.mock.calls[0][0];
      expect(created.userId).toBe("userA");
      expect(created).not.toHaveProperty("id");
      expect(created).toMatchObject({
        accountId: "acc-1",
        amount: -5,
        description: "Coffee",
        category: "Food",
      });
      expect(transactionRepo.save.mock.calls[0][0].userId).toBe("userA");
      expect(accountRepo.findOne).toHaveBeenCalledWith({
        where: { id: "acc-1", userId: "userA" },
      });
    });

    it("stores a client timestamp as a Date and rejects an unparseable one", async () => {
      const { service, transactionRepo, accountRepo } = createService();
      accountRepo.findOne.mockResolvedValue({ id: "acc-1", userId: "userA" });
      const body = { accountId: "acc-1", amount: 1, description: "x", category: "y" };

      await service.createTransaction("userA", { ...body, timestamp: "2026-01-01T10:00:00Z" });
      expect(transactionRepo.create.mock.calls[0][0].timestamp).toEqual(
        new Date("2026-01-01T10:00:00Z"),
      );

      await expect(
        service.createTransaction("userA", { ...body, timestamp: "not a date" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a transaction against an account the caller does not own and saves nothing", async () => {
      const { service, transactionRepo, accountRepo } = createService();
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTransaction("userB", {
          accountId: "acc-A",
          amount: 1,
          description: "x",
          category: "y",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(accountRepo.findOne).toHaveBeenCalledWith({
        where: { id: "acc-A", userId: "userB" },
      });
      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it("rejects a transaction with no accountId without querying", async () => {
      const { service, transactionRepo, accountRepo } = createService();

      await expect(
        service.createTransaction("userA", { amount: 1, description: "x", category: "y" } as any),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(accountRepo.findOne).not.toHaveBeenCalled();
      expect(transactionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("bank connection responses", () => {
    const TOKEN_FIELDS = ["accessToken", "refreshToken", "userId"];
    const makeConn = (over: Record<string, unknown> = {}) => ({
      id: "c1",
      userId: "userA",
      institutionId: "monzo",
      institutionName: "Monzo Bank",
      status: "connected",
      authType: "token",
      accessToken: BankSyncOrchestrator.encryptToken("tok"),
      refreshToken: BankSyncOrchestrator.encryptToken("ref"),
      expiresAt: null,
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    });
    const createBankService = (seed: Record<string, unknown>[]) => {
      const bankRepo = createInMemoryRepository(seed);
      const provider = { fetchAccounts: vi.fn().mockResolvedValue([]) };
      const service = new FinanceService(
        {} as any,
        {} as any,
        {} as any,
        bankRepo as any,
        {} as any,
        { getProvider: vi.fn().mockReturnValue(provider) } as any,
        { get: vi.fn() } as any,
      );
      return { service, bankRepo, provider };
    };

    it("getBankConnections returns only the caller's rows without token fields", async () => {
      const { service } = createBankService([
        makeConn({ id: "a1", userId: "userA" }),
        makeConn({ id: "b1", userId: "userB" }),
      ]);

      const result = await service.getBankConnections("userA");

      expect(result.map((c) => c.id)).toEqual(["a1"]);
      for (const field of TOKEN_FIELDS) expect(Object.keys(result[0])).not.toContain(field);
    });

    it("connectBank token path returns a connection without token fields", async () => {
      const { service } = createBankService([]);

      const result: any = await service.connectBank("userA", {
        institutionId: "monzo",
        token: "raw-token",
      });

      expect(result.success).toBe(true);
      for (const field of TOKEN_FIELDS) expect(Object.keys(result.connection)).not.toContain(field);
    });

    it("connectBank token path hides provider error text and saves status error", async () => {
      const { service, provider, bankRepo } = createBankService([]);
      provider.fetchAccounts.mockRejectedValueOnce(new Error("Bearer abc123 rejected"));
      const spy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});

      const error = await service
        .connectBank("userA", { institutionId: "monzo", token: "raw-token" })
        .catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).not.toContain("abc123");
      expect(bankRepo.rows[0].status).toBe("error");
      spy.mockRestore();
    });

    it("sync success response has no token fields", async () => {
      const { service } = createBankService([makeConn()]);

      const result: any = await service.syncBankConnection("userA", "c1");

      expect(result.success).toBe(true);
      for (const field of TOKEN_FIELDS) expect(Object.keys(result.connection)).not.toContain(field);
    });

    it("sync of a connection with a null accessToken marks error and asks to reconnect", async () => {
      const { service, bankRepo } = createBankService([
        makeConn({ accessToken: null, refreshToken: null }),
      ]);

      const error = await service.syncBankConnection("userA", "c1").catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toMatch(/reconnect/i);
      expect(bankRepo.rows[0].status).toBe("error");
    });

    it("sync with undecryptable ciphertext marks error and leaks no ciphertext or key text", async () => {
      const otherKey = "another_key_that_is_at_least_32_chars_long!!";
      const foreign = encryptBankingToken("tok", otherKey);
      const { service, bankRepo } = createBankService([makeConn({ accessToken: foreign })]);

      const error = await service.syncBankConnection("userA", "c1").catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toMatch(/reconnect/i);
      expect(error.message).not.toContain(foreign);
      expect(error.message).not.toMatch(/key|BANKING_TOKEN/i);
      expect(bankRepo.rows[0].status).toBe("error");
    });

    it("sync provider failure returns a generic error with no token fields", async () => {
      const { service, provider } = createBankService([makeConn()]);
      provider.fetchAccounts.mockRejectedValueOnce(new Error("Bearer abc123 rejected"));

      const result: any = await service.syncBankConnection("userA", "c1");

      expect(result.success).toBe(false);
      expect(result.error).not.toContain("abc123");
      for (const field of TOKEN_FIELDS) expect(Object.keys(result.connection)).not.toContain(field);
    });
  });
});
