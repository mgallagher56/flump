import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
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
      const { service, transactionRepo } = createService();

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
    });
  });
});
