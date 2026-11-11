import { BankSyncOrchestrator, encryptBankingToken } from "@flump/banking/server";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FinanceService } from "./finance.service";
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
