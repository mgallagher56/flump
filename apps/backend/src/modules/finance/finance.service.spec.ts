import { BankSyncOrchestrator } from "@flump/banking/server";
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { withManager } from "../../testing/with-manager";
import { londonDate } from "../snapshots/london-date";
import { FinanceService } from "./finance.service";

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
  withManager(accountRepo, {
    Account: accountRepo,
    AccountDetail: accountDetailRepo,
    Transaction: transactionRepo,
  });
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

    it("checks ownership, then deletes transactions, history and the account in one transaction", async () => {
      const { service, accountRepo, transactionRepo, accountDetailRepo } = createService();
      accountRepo.findOne.mockResolvedValue({ id: "acc-1", userId: "userA", balance: "0" });
      const inTransaction = vi.fn();
      const auditInsert = vi.fn().mockResolvedValue(undefined);
      const em = {
        getRepository: (entity: { name: string }) =>
          ({
            Account: accountRepo,
            Transaction: transactionRepo,
            AccountDetail: accountDetailRepo,
            AuditEvent: { insert: auditInsert },
          })[entity.name],
      };
      (accountRepo as any).manager = {
        transaction: async (work: (m: typeof em) => Promise<unknown>) => {
          inTransaction(true);
          return work(em);
        },
      };

      const result = await service.deleteAccount("userA", "acc-1");

      expect(result).toEqual({ success: true });
      expect(inTransaction).toHaveBeenCalledTimes(1);
      expect(accountRepo.findOne).toHaveBeenCalledTimes(1);
      expect(transactionRepo.delete).toHaveBeenCalledWith({ accountId: "acc-1" });
      expect(accountDetailRepo.delete).toHaveBeenCalledWith({ accountId: "acc-1" });
      expect(accountRepo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: "acc-1" }));
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "userA", action: "account.deleted" }),
      );
      const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
        fn.mock.invocationCallOrder[0] ?? 0;
      expect(order(accountRepo.findOne)).toBeLessThan(order(transactionRepo.delete));
      expect(order(transactionRepo.delete)).toBeLessThan(order(accountRepo.remove));
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
  });
});
