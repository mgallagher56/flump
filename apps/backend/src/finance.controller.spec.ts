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

  it("should seed demo data with strict sign convention rules (mortgages negative)", async () => {
    let savedConnection: any = null;
    const savedAccounts: any[] = [];

    const mockBankConnRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn((data) => {
        savedConnection = data;
        return Promise.resolve({ id: "conn-hsbc", ...data });
      }),
    };
    const mockAccountRepo = {
      save: vi.fn((data) => {
        const item = { id: `acc-${savedAccounts.length + 1}`, ...data };
        savedAccounts.push(item);
        return Promise.resolve(item);
      }),
    };
    const mockAccountDetailRepo = {
      save: vi.fn((data) => Promise.resolve(data)),
    };
    const mockTransactionRepo = {
      save: vi.fn((data) => Promise.resolve(data)),
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

    await controller.connectBank({ user: { id: "user-123" } }, { institutionId: "hsbc" });

    expect(savedAccounts.length).toBe(3);
    const mortgage = savedAccounts.find((a) => a.type === "Mortgage");
    expect(mortgage).toBeDefined();
    expect(mortgage.balance).toBeLessThan(0); // -135400
  });
});
