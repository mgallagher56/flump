import { BankSyncOrchestrator } from "@flump/banking/server";
import { describe, expect, it, vi } from "vitest";
import { FinanceController } from "./finance.controller";

describe("FinanceController Banking Orchestration", () => {
  it("should encrypt access token when connecting a bank with token auth", async () => {
    let savedConnection: any = null;
    const mockBankConnRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn((data) => {
        savedConnection = data;
        return Promise.resolve({ id: "conn-1", ...data });
      }),
    };
    const mockAccountRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ id: "acc-1", ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    const mockAccountDetailRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      count: vi.fn().mockResolvedValue(0),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    const mockTransactionRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn((data) => Promise.resolve(data)),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const mockProvider = {
      fetchAccounts: vi.fn().mockResolvedValue([
        {
          externalAccountId: "ext-starling-1",
          name: "Personal Current",
          type: "Current",
          balance: 1500,
          currency: "GBP",
        },
      ]),
      fetchTransactions: vi.fn().mockResolvedValue([]),
    };
    const mockRegistry = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
    };
    const mockConfig = {
      get: vi.fn().mockReturnValue(null),
    };

    const controller = new FinanceController(
      mockAccountRepo as any,
      mockTransactionRepo as any,
      mockAccountDetailRepo as any,
      mockBankConnRepo as any,
      mockProfileRepo as any,
      mockRegistry as any,
      mockConfig as any,
    );

    const rawToken = "starling_pat_secret_token_12345";
    await controller.connectBank(
      { user: { id: "user-123" } },
      { institutionId: "starling", token: rawToken },
    );

    expect(savedConnection).toBeDefined();
    // Token stored in connection must be encrypted (not raw)
    expect(savedConnection.accessToken).not.toEqual(rawToken);
    // Decrypting stored token recovers the original
    expect(BankSyncOrchestrator.decryptToken(savedConnection.accessToken)).toBe(rawToken);
  });

  it("should reject bank connection without token or OAuth credentials rather than seeding dummy data", async () => {
    const mockBankConnRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn(),
    };
    const mockAccountRepo = {
      save: vi.fn(),
    };
    const mockAccountDetailRepo = {
      save: vi.fn(),
    };
    const mockTransactionRepo = {
      save: vi.fn(),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const mockRegistry = {
      getProvider: vi.fn().mockReturnValue(null),
    };
    const mockConfig = {
      get: vi.fn().mockReturnValue(null),
    };

    const controller = new FinanceController(
      mockAccountRepo as any,
      mockTransactionRepo as any,
      mockAccountDetailRepo as any,
      mockBankConnRepo as any,
      mockProfileRepo as any,
      mockRegistry as any,
      mockConfig as any,
    );

    // Unsupported institution
    await expect(
      controller.connectBank({ user: { id: "user-123" } }, { institutionId: "hsbc" }),
    ).rejects.toThrow(/not currently supported/i);

    // Supported institution with no token and no OAuth credentials
    mockRegistry.getProvider.mockReturnValue({
      getAuthUrl: vi.fn(),
    });
    await expect(
      controller.connectBank({ user: { id: "user-123" } }, { institutionId: "monzo" }),
    ).rejects.toThrow(/OAuth credentials are not configured/i);

    expect(mockAccountRepo.save).not.toHaveBeenCalled();
  });

  it("should return OAuth redirect URL when OAuth keys are configured", async () => {
    const mockBankConnRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    };
    const mockAccountRepo = { save: vi.fn() };
    const mockAccountDetailRepo = { save: vi.fn() };
    const mockTransactionRepo = { save: vi.fn() };
    const mockProfileRepo = { findOne: vi.fn() };
    const mockProvider = {
      getAuthUrl: vi.fn().mockReturnValue("https://auth.monzo.com/?client_id=monzo-id"),
    };
    const mockRegistry = {
      getProvider: vi.fn().mockReturnValue(mockProvider),
    };
    const mockConfig = {
      get: vi.fn((key: string) => {
        if (key === "MONZO_CLIENT_ID") return "monzo-client-id";
        if (key === "MONZO_CLIENT_SECRET") return "monzo-client-secret";
        if (key === "BACKEND_URL") return "http://localhost:4000";
        return null;
      }),
    };

    const controller = new FinanceController(
      mockAccountRepo as any,
      mockTransactionRepo as any,
      mockAccountDetailRepo as any,
      mockBankConnRepo as any,
      mockProfileRepo as any,
      mockRegistry as any,
      mockConfig as any,
    );

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
});
