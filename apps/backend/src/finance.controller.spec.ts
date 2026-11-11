import { BankSyncOrchestrator } from "@flump/banking/server";
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { createInMemoryRepository } from "./testing/in-memory-repository";

describe("FinanceController & FinanceService", () => {
  const createMocks = () => {
    const mockBankConnRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "conn-1", ...data })),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const mockAccountRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ id: "acc-1", ...data })),
      save: vi.fn((data) =>
        Promise.resolve(
          Array.isArray(data)
            ? data.map((d, i) => ({ id: `acc-${i}`, ...d }))
            : { id: "acc-1", ...data },
        ),
      ),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const mockAccountDetailRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      count: vi.fn().mockResolvedValue(0),
      save: vi.fn((data) => Promise.resolve(data)),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const mockTransactionRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ id: "tx-1", ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const mockProvider = {
      getAuthUrl: vi.fn().mockReturnValue("https://auth.example.com"),
      exchangeCode: vi.fn().mockResolvedValue({
        accessToken: "new_tok",
        refreshToken: "new_ref",
        expiresIn: 3600,
      }),
      fetchAccounts: vi.fn().mockResolvedValue([
        {
          externalAccountId: "ext-starling-1",
          name: "Personal Current",
          type: "Current",
          balance: 1500,
          currency: "GBP",
        },
      ]),
      fetchTransactions: vi.fn().mockResolvedValue([
        {
          amount: -20,
          description: "Coffee",
          category: "Food",
          timestamp: new Date("2026-01-01T10:00:00Z"),
        },
      ]),
    };
    const mockRegistry = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
    };
    const mockConfig = {
      get: vi.fn().mockReturnValue(null),
    };

    const service = new FinanceService(
      mockAccountRepo as any,
      mockTransactionRepo as any,
      mockAccountDetailRepo as any,
      mockBankConnRepo as any,
      mockProfileRepo as any,
      mockRegistry as any,
      mockConfig as any,
    );

    const controller = new FinanceController(service);

    return {
      controller,
      service,
      mockBankConnRepo,
      mockAccountRepo,
      mockAccountDetailRepo,
      mockTransactionRepo,
      mockProfileRepo,
      mockProvider,
      mockRegistry,
      mockConfig,
    };
  };

  it("handles account CRUD and auto-seeding", async () => {
    const { controller, mockAccountRepo, mockAccountDetailRepo } = createMocks();
    const req = { user: { id: "u1" } };

    // Auto-seeds when empty and not reset
    mockAccountDetailRepo.find.mockResolvedValueOnce([
      { accountId: "acc-0", year: 2026, month: 1, value: 2450.75 },
    ]);
    const seeded = await controller.getAccounts(req);
    expect(seeded.length).toBe(4);
    expect(seeded[0].details).toHaveLength(1);

    // Get single account found & not found
    await expect(controller.getAccount(req, "missing")).rejects.toThrow(NotFoundException);
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1", name: "Checking" });
    const single = await controller.getAccount(req, "acc-1");
    expect(single.id).toBe("acc-1");

    // Create account
    const created = await controller.createAccount(req, {
      name: "ISA",
      type: "Saving",
      balance: 100,
    });
    expect(created.name).toBe("ISA");

    // Update account found & not found
    await expect(controller.updateAccount(req, "missing", { balance: 500 })).rejects.toThrow(
      NotFoundException,
    );
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1", name: "Old", balance: 100 });
    const updated = await controller.updateAccount(req, "acc-1", { balance: 500 });
    expect(updated.balance).toBe(500);

    // Delete account found & not found
    await expect(controller.deleteAccount(req, "missing")).rejects.toThrow(NotFoundException);
    // Ownership check in FinanceService, then the delete lookup in AccountIntakeService.
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1" });
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1" });
    const delRes = await controller.deleteAccount(req, "acc-1");
    expect(delRes.success).toBe(true);
    expect(mockAccountDetailRepo.delete).toHaveBeenCalledWith({ accountId: "acc-1" });
  });

  it("handles transactions and bank connections listing", async () => {
    const { controller, mockTransactionRepo, mockBankConnRepo } = createMocks();
    const req = { user: { id: "u1" } };

    await controller.getTransactions(req);
    expect(mockTransactionRepo.find).toHaveBeenCalledWith({
      where: { userId: "u1" },
      order: { timestamp: "DESC" },
    });

    await controller.getTransactions(req, "acc-1");
    expect(mockTransactionRepo.find).toHaveBeenCalledWith({
      where: { userId: "u1", accountId: "acc-1" },
      order: { timestamp: "DESC" },
    });

    await controller.getBankConnections(req);
    expect(mockBankConnRepo.find).toHaveBeenCalled();
  });

  it("should encrypt access token when connecting a bank with token auth and handle existing connection/accounts", async () => {
    const { controller, mockBankConnRepo, mockAccountRepo, mockAccountDetailRepo, mockProvider } =
      createMocks();
    let savedConnection: any = null;
    mockBankConnRepo.findOne.mockResolvedValueOnce({
      id: "conn-existing",
      institutionId: "starling",
    });
    mockBankConnRepo.save.mockImplementation((data) => {
      savedConnection = data;
      return Promise.resolve({ id: "conn-existing", ...data });
    });
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-existing", balance: 100 });
    mockAccountDetailRepo.findOne.mockResolvedValueOnce({ id: "det-existing", value: 100 });

    const rawToken = "starling_pat_secret_token_12345";
    await controller.connectBank(
      { user: { id: "user-123" } },
      { institutionId: "starling", token: rawToken },
    );

    expect(savedConnection).toBeDefined();
    expect(savedConnection.accessToken).not.toEqual(rawToken);
    expect(BankSyncOrchestrator.decryptToken(savedConnection.accessToken)).toBe(rawToken);

    // Token sync verification failure
    mockProvider.fetchAccounts.mockRejectedValueOnce(new Error("API Down"));
    await expect(
      controller.connectBank(
        { user: { id: "user-123" } },
        { institutionId: "starling", token: rawToken },
      ),
    ).rejects.toThrow(/Token sync verification failed: API Down/);
  });

  it("should reject bank connection without token or OAuth credentials rather than seeding dummy data", async () => {
    const { controller, mockAccountRepo, mockRegistry } = createMocks();
    mockRegistry.getProvider.mockReturnValue(null);

    await expect(
      controller.connectBank({ user: { id: "user-123" } }, { institutionId: "hsbc" }),
    ).rejects.toThrow(/not currently supported/i);

    mockRegistry.getProvider.mockReturnValue({ getAuthUrl: vi.fn() });
    await expect(
      controller.connectBank({ user: { id: "user-123" } }, { institutionId: "monzo" }),
    ).rejects.toThrow(/OAuth credentials are not configured/i);

    expect(mockAccountRepo.save).not.toHaveBeenCalled();
  });

  it("should return OAuth redirect URL when OAuth keys are configured", async () => {
    const { controller, mockConfig, mockProvider } = createMocks();
    mockProvider.getAuthUrl.mockReturnValue("https://auth.monzo.com/?client_id=monzo-id");
    mockConfig.get.mockImplementation((key: string) => {
      if (key === "MONZO_CLIENT_ID") return "monzo-client-id";
      if (key === "MONZO_CLIENT_SECRET") return "monzo-client-secret";
      if (key === "BACKEND_URL") return "http://localhost:4000";
      return null;
    });

    const result = await controller.connectBank(
      { user: { id: "user-123" } },
      { institutionId: "monzo" },
    );

    expect(result).toEqual({
      success: true,
      oauth: true,
      redirectUrl: "https://auth.monzo.com/?client_id=monzo-id",
    });
  });

  it("delegates account intake and portfolio snapshot operations cleanly", async () => {
    const mockAccounts = [
      {
        id: "acc-1",
        userId: "user-123",
        name: "Current Account",
        type: "Current",
        balance: 1000,
        currency: "GBP",
        isCurrent: true,
        details: [],
      },
    ];
    const mockDetails = [{ id: "det-1", accountId: "acc-1", month: 1, year: 2026, value: 1000 }];
    const mockSnapshot = {
      netWorth: 1000,
      totalAssets: 1000,
      totalLiabilities: 0,
      totalLiquidCash: 1000,
      totalInvestments: 0,
      totalPensions: 0,
      totalConsumerDebt: 0,
      totalMortgageBalance: 0,
      resolvedAccounts: [],
      monthlyHistory: [],
      currency: "GBP",
    };

    const mockFinanceService = {
      getAccounts: vi.fn().mockResolvedValue(mockAccounts),
      getAccount: vi.fn().mockResolvedValue(mockAccounts[0]),
      getAccountDetails: vi.fn().mockResolvedValue(mockDetails),
      getPortfolioSnapshot: vi.fn().mockResolvedValue(mockSnapshot),
      createAccount: vi.fn().mockResolvedValue(mockAccounts[0]),
      updateAccount: vi.fn().mockResolvedValue(mockAccounts[0]),
      deleteAccount: vi.fn().mockResolvedValue({ success: true }),
    };

    const controller = new FinanceController(mockFinanceService as any);

    const userReq = { user: { id: "user-123" } };
    expect(await controller.getAccounts(userReq)).toEqual(mockAccounts);
    expect(await controller.getAccount(userReq, "acc-1")).toEqual(mockAccounts[0]);
    expect(await controller.getAccountDetails(userReq)).toEqual(mockDetails);
    expect(await controller.getAccountSpecificDetails(userReq, "acc-1")).toEqual(mockDetails);
    expect(await controller.getPortfolioSnapshot(userReq)).toEqual(mockSnapshot);

    const createDto = { name: "Savings", type: "Saving", balance: 500 };
    await controller.createAccount(userReq, createDto);
    expect(mockFinanceService.createAccount).toHaveBeenCalledWith("user-123", createDto);

    const updateDto = { balance: 600 };
    await controller.updateAccount(userReq, "acc-1", updateDto);
    expect(mockFinanceService.updateAccount).toHaveBeenCalledWith("user-123", "acc-1", updateDto);

    await controller.deleteAccount(userReq, "acc-1");
    expect(mockFinanceService.deleteAccount).toHaveBeenCalledWith("user-123", "acc-1");
  });

  it("syncs and deletes bank connections including token refresh and error handling", async () => {
    const { controller, mockBankConnRepo, mockConfig, mockProvider, mockAccountRepo } =
      createMocks();
    const req = { user: { id: "u1" } };

    // Sync not found
    await expect(controller.syncBankConnection(req, "missing")).rejects.toThrow(NotFoundException);

    // Sync with no accessToken
    mockBankConnRepo.findOne.mockResolvedValueOnce({ id: "c1", institutionId: "monzo" });
    await expect(controller.syncBankConnection(req, "c1")).rejects.toThrow(/reconnected/);

    // Sync with expiring token triggers refresh
    mockConfig.get.mockReturnValue("secret");
    mockBankConnRepo.findOne.mockResolvedValueOnce({
      id: "c1",
      institutionId: "monzo",
      accessToken: BankSyncOrchestrator.encryptToken("old_tok"),
      refreshToken: BankSyncOrchestrator.encryptToken("old_ref"),
      expiresAt: new Date(Date.now() + 60000),
    });

    const syncRes = await controller.syncBankConnection(req, "c1");
    expect(syncRes.success).toBe(true);
    expect(mockProvider.exchangeCode).toHaveBeenCalled();

    // Sync provider error returns success: false with a generic message
    mockBankConnRepo.findOne.mockResolvedValueOnce({
      id: "c1",
      institutionId: "monzo",
      institutionName: "Monzo",
      accessToken: BankSyncOrchestrator.encryptToken("tok"),
    });
    mockProvider.fetchAccounts.mockRejectedValueOnce(new Error("timeout"));
    const failRes = await controller.syncBankConnection(req, "c1");
    expect(failRes.success).toBe(false);
    expect(failRes.error).not.toContain("timeout");
    expect(Object.keys(failRes.connection)).not.toContain("accessToken");

    // Delete connection not found & found
    await expect(controller.deleteBankConnection(req, "missing")).rejects.toThrow(
      NotFoundException,
    );
    mockBankConnRepo.findOne.mockResolvedValueOnce({ id: "c1" });
    mockAccountRepo.find.mockResolvedValueOnce([{ id: "acc-1" }]);
    const delConn = await controller.deleteBankConnection(req, "c1");
    expect(delConn.success).toBe(true);
    expect(mockBankConnRepo.remove).toHaveBeenCalled();
  });

  describe("cross-user access (user B against user A's rows)", () => {
    const userA = { user: { id: "userA" } };
    const userB = { user: { id: "userB" } };

    const createScopedController = () => {
      const accountRepo = createInMemoryRepository([
        { id: "acc-A", userId: "userA", name: "Savings", type: "Saving", balance: "100" },
      ]);
      const transactionRepo = createInMemoryRepository([
        { id: "tx-A", userId: "userA", accountId: "acc-A", amount: -5, description: "Coffee" },
      ]);
      const accountDetailRepo = createInMemoryRepository([
        { id: "det-A", accountId: "acc-A", year: 2026, month: 1, value: "100" },
      ]);
      const bankConnRepo = createInMemoryRepository([
        { id: "conn-A", userId: "userA", institutionId: "monzo", status: "connected" },
      ]);
      const profileRepo = createInMemoryRepository([
        { userId: "userB", hasResetFinancialData: true },
      ]);
      const service = new FinanceService(
        accountRepo as any,
        transactionRepo as any,
        accountDetailRepo as any,
        bankConnRepo as any,
        profileRepo as any,
        { getProvider: vi.fn() } as any,
        { get: vi.fn() } as any,
      );
      return {
        controller: new FinanceController(service),
        accountRepo,
        transactionRepo,
        accountDetailRepo,
        bankConnRepo,
      };
    };

    it("account: B gets not-found on get, update and delete of A's account, which is unchanged", async () => {
      const { controller, accountRepo, accountDetailRepo, transactionRepo } =
        createScopedController();

      await expect(controller.getAccount(userB, "acc-A")).rejects.toThrow(NotFoundException);
      await expect(
        controller.updateAccount(userB, "acc-A", { balance: 0, name: "Hijacked" }),
      ).rejects.toThrow(NotFoundException);
      await expect(controller.deleteAccount(userB, "acc-A")).rejects.toThrow(NotFoundException);

      expect(accountRepo.rows).toEqual([
        { id: "acc-A", userId: "userA", name: "Savings", type: "Saving", balance: "100" },
      ]);
      expect(accountDetailRepo.rows).toHaveLength(1);
      expect(transactionRepo.rows).toHaveLength(1);

      // The owner still sees the same row.
      expect((await controller.getAccount(userA, "acc-A")).name).toBe("Savings");
    });

    it("account: B cannot create an account that takes over A's row id", async () => {
      const { controller, accountRepo } = createScopedController();

      await controller.createAccount(userB, {
        id: "acc-A",
        userId: "userA",
        name: "Mine",
        type: "Current",
        balance: 1,
      } as any);

      expect(accountRepo.rows.find((r) => r.id === "acc-A")).toMatchObject({
        userId: "userA",
        name: "Savings",
      });
      expect(accountRepo.rows.filter((r) => r.userId === "userB")).toHaveLength(1);
    });

    it("transaction: B sees none of A's transactions and cannot write into or against A's", async () => {
      const { controller, transactionRepo } = createScopedController();

      expect(await controller.getTransactions(userB)).toEqual([]);
      expect(await controller.getTransactions(userB, "acc-A")).toEqual([]);

      await expect(
        controller.createTransaction(userB, {
          id: "tx-A",
          userId: "userA",
          accountId: "acc-A",
          amount: 999,
          description: "Forged",
          category: "Other",
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(transactionRepo.rows).toEqual([
        { id: "tx-A", userId: "userA", accountId: "acc-A", amount: -5, description: "Coffee" },
      ]);
      expect(await controller.getTransactions(userA)).toHaveLength(1);
    });

    it("bank connection: B gets not-found on sync and delete of A's connection, which is unchanged", async () => {
      const { controller, bankConnRepo, accountRepo } = createScopedController();

      await expect(controller.syncBankConnection(userB, "conn-A")).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.deleteBankConnection(userB, "conn-A")).rejects.toThrow(
        NotFoundException,
      );

      expect(bankConnRepo.rows).toEqual([
        { id: "conn-A", userId: "userA", institutionId: "monzo", status: "connected" },
      ]);
      expect(accountRepo.rows).toHaveLength(1);
      expect(await controller.getBankConnections(userB)).toEqual([]);
      expect(await controller.getBankConnections(userA)).toHaveLength(1);
    });
  });
});
