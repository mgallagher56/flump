import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntakeService } from "./account-intake.service";

describe("AccountIntakeService (Deep Module)", () => {
  let service: AccountIntakeService;
  let mockAccountRepo: any;
  let mockAccountDetailRepo: any;
  let mockUserProfileRepo: any;
  let mockBankConnectionRepo: any;

  beforeEach(() => {
    mockAccountRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: "acc-new", ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
      remove: vi.fn().mockResolvedValue({ id: "acc-1" }),
    };
    mockAccountDetailRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    mockUserProfileRepo = {
      findOne: vi.fn().mockResolvedValue({ userId: "user-123", hasResetFinancialData: false }),
    };

    mockBankConnectionRepo = { findOne: vi.fn().mockResolvedValue(null) };

    service = new AccountIntakeService(
      mockAccountRepo,
      mockAccountDetailRepo,
      mockUserProfileRepo,
      mockBankConnectionRepo,
    );
  });

  it("auto-seeds canonical default accounts when user has no accounts and has not reset", async () => {
    mockAccountRepo.find.mockResolvedValueOnce([]); // no existing accounts
    mockAccountRepo.save.mockResolvedValueOnce([
      { id: "acc-1", userId: "user-123", name: "Main Checking", type: "Current", balance: 2450.75 },
    ]);
    mockAccountDetailRepo.find.mockResolvedValueOnce([]);

    const accounts = await service.getAccounts("user-123");

    expect(mockAccountRepo.save).toHaveBeenCalled();
    expect(accounts.length).toBe(1);
    expect(accounts[0].name).toBe("Main Checking");
    expect(accounts[0].balance).toBe(2450.75);
    expect(accounts[0].details).toEqual([]);
  });

  it("retrieves account details scoped to user's accounts", async () => {
    mockAccountRepo.find.mockResolvedValueOnce([{ id: "acc-1" }, { id: "acc-2" }]);
    mockAccountDetailRepo.find.mockResolvedValueOnce([
      { accountId: "acc-1", month: 1, year: 2026, value: 1000 },
      { accountId: "acc-2", month: 1, year: 2026, value: 5000 },
    ]);

    const details = await service.getAccountDetails("user-123");

    expect(details.length).toBe(2);
    expect(mockAccountDetailRepo.find).toHaveBeenCalled();
  });

  it("calculates PortfolioSnapshot rollup using @flump/finance-engine", async () => {
    mockAccountRepo.find.mockResolvedValue([
      {
        id: "acc-1",
        userId: "user-123",
        name: "Main Checking",
        type: "Current",
        balance: 5000,
        currency: "GBP",
        isCurrent: true,
      },
      {
        id: "acc-2",
        userId: "user-123",
        name: "Mortgage",
        type: "Mortgage",
        balance: -100000,
        currency: "GBP",
        isCurrent: true,
      },
    ]);
    mockAccountDetailRepo.find.mockResolvedValue([]);

    const snapshot = await service.getPortfolioSnapshot("user-123");

    expect(snapshot).toBeDefined();
    expect(snapshot.totalAssets).toBe(5000);
    expect(snapshot.totalLiabilities).toBe(100000);
    expect(snapshot.netWorth).toBe(-95000);
    expect(snapshot.currency).toBe("GBP");
  });

  it("deletes account and cascades delete to associated account details", async () => {
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1", userId: "user-123" });

    const result = await service.deleteAccount("user-123", "acc-1");

    expect(result.success).toBe(true);
    expect(mockAccountDetailRepo.delete).toHaveBeenCalledWith({ accountId: "acc-1" });
    expect(mockAccountRepo.remove).toHaveBeenCalled();
  });
  describe("account writes ignore client-supplied ids and ownership", () => {
    const valid = { name: "Savings", type: "Saving", balance: 100, currency: "GBP" };

    it("createAccount saves with the caller's userId and no id override", async () => {
      const body = { ...valid, id: "other-id", userId: "userB" } as any;

      await service.createAccount("userA", body);

      const created = mockAccountRepo.create.mock.calls[0][0];
      expect(created).toEqual({ ...valid, userId: "userA" });
      expect(created).not.toHaveProperty("id");
      const saved = mockAccountRepo.save.mock.calls[0][0];
      expect(saved.userId).toBe("userA");
      expect(saved.id).toBe("acc-new");
    });

    it("createAccount rejects a connectionId owned by another user", async () => {
      mockBankConnectionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createAccount("userA", { ...valid, connectionId: "conn-of-userB" }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockBankConnectionRepo.findOne).toHaveBeenCalledWith({
        where: { id: "conn-of-userB", userId: "userA" },
      });
      expect(mockAccountRepo.save).not.toHaveBeenCalled();
    });

    it("createAccount accepts a connectionId owned by the caller", async () => {
      mockBankConnectionRepo.findOne.mockResolvedValue({ id: "conn-1", userId: "userA" });

      await service.createAccount("userA", { ...valid, connectionId: "conn-1" });

      expect(mockAccountRepo.save.mock.calls[0][0].connectionId).toBe("conn-1");
    });

    it("updateAccount leaves id, userId and connectionId unchanged but applies balance", async () => {
      const existing = {
        id: "own-id",
        userId: "userA",
        connectionId: "conn-1",
        name: "Savings",
        balance: 100,
      };
      mockAccountRepo.findOne.mockResolvedValue(existing);

      const result = await service.updateAccount("userA", "own-id", {
        userId: "userB",
        id: "x",
        connectionId: "conn-of-userB",
        balance: 5,
      } as any);

      expect(mockAccountRepo.findOne).toHaveBeenCalledWith({
        where: { id: "own-id", userId: "userA" },
      });
      expect(result.id).toBe("own-id");
      expect(result.userId).toBe("userA");
      expect(result.connectionId).toBe("conn-1");
      expect(result.balance).toBe(5);
    });
  });
});
