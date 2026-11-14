import {
  DEFAULT_TRANSACTION_PAGE,
  MAX_TRANSACTION_OFFSET,
  MAX_TRANSACTION_PAGE,
} from "@flump/api-contract";
import { BankSyncOrchestrator } from "@flump/banking/server";
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryRepository, fakeListQueryBuilder } from "../../testing/in-memory-repository";
import { withManager } from "../../testing/with-manager";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

const ACC_1 = "00000000-0000-4000-8000-000000000001";

describe("FinanceController & FinanceService", () => {
  const createMocks = () => {
    const mockBankConnRepo = {
      find: vi.fn().mockResolvedValue([]),
      createQueryBuilder: vi.fn(() => fakeListQueryBuilder(() => [])),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      save: vi.fn((data) => Promise.resolve({ id: "conn-1", ...data })),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const mockAccountRepo = {
      find: vi.fn().mockResolvedValue([]),
      createQueryBuilder: vi.fn(() => fakeListQueryBuilder(() => [])),
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
      createQueryBuilder: vi.fn(() => fakeListQueryBuilder(() => [])),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ ...data })),
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn().mockResolvedValue(undefined),
      save: vi.fn((data) => Promise.resolve(data)),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const mockTransactionRepo = {
      find: vi.fn().mockResolvedValue([]),
      createQueryBuilder: vi.fn(() => fakeListQueryBuilder(() => [])),
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

    const mockAuditInsert = vi.fn().mockResolvedValue(undefined);
    withManager(mockAccountRepo, {
      AuditEvent: { insert: mockAuditInsert },
      Account: mockAccountRepo,
      AccountDetail: mockAccountDetailRepo,
      Transaction: mockTransactionRepo,
    });
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
      mockAuditInsert,
      mockAccountRepo,
      mockAccountDetailRepo,
      mockTransactionRepo,
      mockProfileRepo,
      mockProvider,
      mockRegistry,
      mockConfig,
    };
  };

  it("PATCH accounts/balances scopes the batch to req.user.id and 404s for a foreign id", async () => {
    const { controller, mockAccountRepo } = createMocks();
    const id = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c11";
    // The owner's lookup returns nothing for an account that belongs to someone else.
    mockAccountRepo.find.mockResolvedValueOnce([]);
    await expect(
      controller.updateBalances({ user: { id: "userB" } }, { balances: [{ id, balance: 5 }] }),
    ).rejects.toThrow(NotFoundException);
    expect(mockAccountRepo.find.mock.calls[0][0].where.userId).toBe("userB");
    expect(mockAccountRepo.save).not.toHaveBeenCalled();
  });

  it("handles account CRUD without seeding", async () => {
    const { controller, mockAccountRepo, mockAccountDetailRepo, mockAuditInsert } = createMocks();
    const req = { user: { id: "u1" } };

    // An empty repository yields no accounts and nothing is written
    const empty = await controller.getAccounts(req);
    expect(empty).toHaveLength(0);
    expect(mockAccountRepo.save).not.toHaveBeenCalled();

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
    expect(mockAuditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", action: "account.deleted" }),
    );
  });

  it("passes mortgage term fields through create and update, and rejects invalid ones", async () => {
    const { controller, mockAccountRepo } = createMocks();
    const req = { user: { id: "u1" } };

    const created = await controller.createAccount(req, {
      name: "Home",
      type: "Mortgage",
      balance: 250000,
      termMonths: 300,
      fixedRateEndDate: "2029-06-30",
    });
    expect(created).toMatchObject({ termMonths: 300, fixedRateEndDate: "2029-06-30" });

    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1", termMonths: 300 });
    const updated = await controller.updateAccount(req, "acc-1", { termMonths: null });
    expect(updated.termMonths).toBeNull();

    await expect(
      controller.createAccount(req, {
        name: "Home",
        type: "Mortgage",
        balance: 1,
        termMonths: 601,
      }),
    ).rejects.toThrow(BadRequestException);
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1" });
    await expect(
      controller.updateAccount(req, "acc-1", { fixedRateEndDate: "not-a-date" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("bounds GET /transactions: limit and offset page it, and anything out of range is a 400", async () => {
    const { controller, mockTransactionRepo } = createMocks();
    const req = { user: { id: "u1" } };
    const rows = Array.from({ length: 80 }, (_, i) => ({ id: `tx-${i}`, userId: "u1" }));
    mockTransactionRepo.createQueryBuilder.mockImplementation(() =>
      fakeListQueryBuilder(() => rows),
    );

    const page = await controller.getTransactions(req, { limit: "25", offset: "50" } as never);
    expect(page.map((t) => t.id)).toEqual(rows.slice(50, 75).map((r) => r.id));
    expect(await controller.getTransactions(req)).toHaveLength(
      Math.min(80, DEFAULT_TRANSACTION_PAGE),
    );
    for (const query of [
      { limit: "0" },
      { limit: String(MAX_TRANSACTION_PAGE + 1) },
      { limit: "2.5" },
      { limit: "abc" },
      { offset: "-1" },
      { offset: String(MAX_TRANSACTION_OFFSET + 1) },
      { offset: "10", cursor: "abc" },
    ]) {
      await expect(controller.getTransactions(req, query as never)).rejects.toThrow(
        BadRequestException,
      );
    }
  });

  it("lists no transactions for an accountId that is not a uuid, without querying", async () => {
    const { controller, mockTransactionRepo } = createMocks();
    mockTransactionRepo.createQueryBuilder.mockClear();
    expect(
      await controller.getTransactions({ user: { id: "u1" } }, { accountId: "acc-1" }),
    ).toEqual([]);
    expect(mockTransactionRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it("handles transactions and bank connections listing", async () => {
    const { controller, mockTransactionRepo, mockBankConnRepo } = createMocks();
    const req = { user: { id: "u1" } };

    const rows = [
      { id: "tx-1", userId: "u1", accountId: ACC_1 },
      { id: "tx-2", userId: "u1", accountId: "acc-2" },
      { id: "tx-3", userId: "u2", accountId: ACC_1 },
    ];
    mockTransactionRepo.createQueryBuilder.mockImplementation(() =>
      fakeListQueryBuilder(() => rows),
    );
    expect((await controller.getTransactions(req)).map((t) => t.id)).toEqual(["tx-1", "tx-2"]);
    expect((await controller.getTransactions(req, { accountId: ACC_1 })).map((t) => t.id)).toEqual([
      "tx-1",
    ]);
    // A page of one sets X-Next-Cursor (from Postgres in real use; empty keys here).
    const res = { setHeader: vi.fn() };
    expect(
      await controller.getTransactions(req, { limit: "1" } as never, res as never),
    ).toHaveLength(1);
    expect(res.setHeader).toHaveBeenCalledWith("X-Next-Cursor", expect.any(String));
    await expect(
      controller.getTransactions(req, { limit: String(MAX_TRANSACTION_PAGE + 1) } as never),
    ).rejects.toThrow(BadRequestException);

    await controller.getBankConnections(req);
    expect(mockBankConnRepo.createQueryBuilder).toHaveBeenCalled();
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
      getAccounts: vi.fn(),
      listAccounts: vi.fn().mockResolvedValue({ items: mockAccounts, nextCursor: null }),
      getAccount: vi.fn().mockResolvedValue(mockAccounts[0]),
      listAccountDetails: vi.fn().mockResolvedValue({ items: mockDetails, nextCursor: null }),
      getPortfolioSnapshot: vi.fn().mockResolvedValue(mockSnapshot),
      createAccount: vi.fn().mockResolvedValue(mockAccounts[0]),
      updateAccount: vi.fn().mockResolvedValue(mockAccounts[0]),
      deleteAccount: vi.fn().mockResolvedValue({ success: true }),
    };

    const controller = new FinanceController(mockFinanceService as any);

    const userReq = { user: { id: "user-123" } };
    // Responses never carry the owner id (BE-09, audit L3).
    const { userId: _owner, ...publicAccount } = mockAccounts[0] as (typeof mockAccounts)[0];
    expect(await controller.getAccounts(userReq)).toEqual([publicAccount]);
    expect(await controller.getAccount(userReq, "acc-1")).toEqual(publicAccount);
    expect(await controller.getAccountDetails(userReq)).toEqual(mockDetails);
    expect(await controller.getAccountSpecificDetails(userReq, "acc-1")).toEqual(mockDetails);
    expect(await controller.getPortfolioSnapshot(userReq)).toEqual(mockSnapshot);

    const createDto = { name: "Savings", type: "Saving", balance: 500 } as const;
    await controller.createAccount(userReq, createDto);
    expect(mockFinanceService.createAccount).toHaveBeenCalledWith("user-123", createDto);

    const updateDto = { balance: 600 };
    await controller.updateAccount(userReq, "acc-1", updateDto);
    expect(mockFinanceService.updateAccount).toHaveBeenCalledWith(
      "user-123",
      "acc-1",
      updateDto,
      undefined,
    );

    await controller.deleteAccount(userReq, "acc-1");
    expect(mockFinanceService.deleteAccount).toHaveBeenCalledWith("user-123", "acc-1");
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
      withManager(accountRepo, {
        Account: accountRepo,
        AccountDetail: accountDetailRepo,
        Transaction: transactionRepo,
      });
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
      expect(await controller.getTransactions(userB, { accountId: "acc-A" })).toEqual([]);

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

  it("registers both sync and refresh POST routes for bank-connections/:id", () => {
    const proto = FinanceController.prototype as unknown as Record<string, object>;
    const paths = Object.getOwnPropertyNames(proto)
      .map((name) => proto[name])
      .filter((fn) => typeof fn === "function" && Reflect.getMetadata("method", fn) === 1)
      .map((fn) => Reflect.getMetadata("path", fn));
    expect(paths).toEqual(
      expect.arrayContaining(["bank-connections/:id/sync", "bank-connections/:id/refresh"]),
    );
  });

  it("registers both PUT and PATCH for accounts/:id", () => {
    // Stacked @Put/@Patch decorators on one handler only register one verb (RequestMethod: GET 0,
    // POST 1, PUT 2, DELETE 3, PATCH 4).
    const proto = FinanceController.prototype as unknown as Record<string, object>;
    const verbs = Object.getOwnPropertyNames(proto)
      .map((name) => proto[name])
      .filter(
        (fn) => typeof fn === "function" && Reflect.getMetadata("path", fn) === "accounts/:id",
      )
      .map((fn) => Reflect.getMetadata("method", fn));
    expect(verbs).toEqual(expect.arrayContaining([2, 4]));
  });

  it("returns 404 for another user's account on both PUT and PATCH", async () => {
    const { controller } = createMocks();
    const userB = { user: { id: "userB" } } as any;

    await expect(controller.replaceAccount(userB, "acc-of-userA", { balance: 1 })).rejects.toThrow(
      NotFoundException,
    );
    await expect(controller.updateAccount(userB, "acc-of-userA", { balance: 1 })).rejects.toThrow(
      NotFoundException,
    );
  });
});
