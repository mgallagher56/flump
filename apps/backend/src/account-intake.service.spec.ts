import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountIntakeService } from "./account-intake.service";
import { createInMemoryRepository } from "./testing/in-memory-repository";

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
      upsert: vi.fn().mockResolvedValue(undefined),
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

  describe("stored-balance sign rule (BE-05, audit H6)", () => {
    it("creates a liability negative whatever sign it is sent with, and keeps an asset's sign", async () => {
      const cases: Array<[string, number, number]> = [
        ["Credit Card", 500, -500],
        ["Credit Card", -500, -500],
        ["Mortgage", 200000, -200000],
        ["Loan", 1200, -1200],
        ["Overdraft", 300, -300],
        ["Student Loan", 42000, -42000],
        ["Current", -150, -150],
        ["Saving", 3000, 3000],
      ];
      for (const [type, sent, stored] of cases) {
        mockAccountRepo.create.mockClear();
        await service.createAccount("userA", { name: "A", type, balance: sent } as never);
        expect(mockAccountRepo.create.mock.calls[0][0].balance, type).toBe(stored);
      }
    });

    it("re-signs the balance and positive history when an update makes the account a liability", async () => {
      mockAccountRepo.findOne.mockResolvedValueOnce({
        id: "a1",
        userId: "userA",
        type: "Saving",
        balance: 800,
      });
      const history = [
        { id: 1, accountId: "a1", value: 700 },
        { id: 2, accountId: "a1", value: -5 },
      ];
      mockAccountDetailRepo.find.mockResolvedValueOnce(history);
      await service.updateAccount("userA", "a1", { type: "Credit Card" });
      expect(mockAccountRepo.save.mock.calls[0][0]).toMatchObject({
        type: "Credit Card",
        balance: -800,
      });
      expect(mockAccountDetailRepo.save).toHaveBeenCalledWith([
        { id: 1, accountId: "a1", value: -700 },
      ]);
      // A history re-sign is not a balance edit: no current-month row is written.
      expect(mockAccountDetailRepo.upsert).not.toHaveBeenCalled();
    });
  });

  it("returns [] and never saves for a user with no accounts", async () => {
    mockAccountRepo.find.mockResolvedValueOnce([]);

    const accounts = await service.getAccounts("user-123");

    expect(accounts).toEqual([]);
    expect(mockAccountRepo.save).not.toHaveBeenCalled();
  });

  it("getPortfolioSnapshot for a new user returns zero totals without writing", async () => {
    mockAccountRepo.find.mockResolvedValue([]);

    const snapshot = await service.getPortfolioSnapshot("user-123");

    expect(snapshot.netWorth).toBe(0);
    expect(snapshot.resolvedAccounts).toEqual([]);
    expect(mockAccountRepo.save).not.toHaveBeenCalled();
  });

  it("concurrent getAccounts and getPortfolioSnapshot insert nothing", async () => {
    const accountRepo = createInMemoryRepository();
    const detailRepo = createInMemoryRepository();
    const profileRepo = createInMemoryRepository();
    const concurrent = new AccountIntakeService(
      accountRepo as any,
      detailRepo as any,
      profileRepo as any,
      mockBankConnectionRepo,
    );

    await Promise.all([
      concurrent.getAccounts("user-123"),
      concurrent.getPortfolioSnapshot("user-123"),
      concurrent.getAccounts("user-123"),
    ]);

    expect(accountRepo.rows).toHaveLength(0);
    expect(accountRepo.save).not.toHaveBeenCalled();
    expect(profileRepo.save).not.toHaveBeenCalled();
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

  it("getPortfolioSnapshot runs two queries: accounts, then their history (audit M24)", async () => {
    mockAccountRepo.find.mockResolvedValue([
      { id: "acc-1", userId: "user-123", name: "Cash", type: "Current", balance: 900 },
    ]);
    mockAccountDetailRepo.find.mockResolvedValue([
      { accountId: "acc-1", year: 2026, month: 1, value: 800 },
      { accountId: "acc-1", year: 2026, month: 2, value: 900 },
    ]);

    const snapshot = await service.getPortfolioSnapshot("user-123");

    expect(mockAccountRepo.find).toHaveBeenCalledTimes(1);
    expect(mockAccountDetailRepo.find).toHaveBeenCalledTimes(1);
    expect(snapshot.totalAssets).toBe(900);
    expect(snapshot.monthlyHistory.length).toBeGreaterThan(0);
  });

  it("deletes account and cascades delete to associated account details", async () => {
    mockAccountRepo.findOne.mockResolvedValueOnce({ id: "acc-1", userId: "user-123" });

    const result = await service.deleteAccount("user-123", "acc-1");

    expect(result.success).toBe(true);
    expect(mockAccountDetailRepo.delete).toHaveBeenCalledWith({ accountId: "acc-1" });
    expect(mockAccountRepo.remove).toHaveBeenCalled();
  });
  describe("student loan plan", () => {
    const loan = { name: "SL", type: "Student Loan", balance: 40000, currency: "GBP" };

    it("persists a valid plan", async () => {
      await service.createAccount("userA", { ...loan, studentLoanPlan: "PLAN_2" });
      expect(mockAccountRepo.create.mock.calls[0][0]).toMatchObject({ studentLoanPlan: "PLAN_2" });
    });

    it("rejects an unknown plan with a 400 on create and update", async () => {
      await expect(
        service.createAccount("userA", { ...loan, studentLoanPlan: "PLAN_9" as never }),
      ).rejects.toThrow(/studentLoanPlan/);
      mockAccountRepo.findOne.mockResolvedValueOnce({ id: "a1", userId: "userA" });
      await expect(
        service.updateAccount("userA", "a1", { studentLoanPlan: "nope" as never }),
      ).rejects.toThrow(/studentLoanPlan/);
    });

    it("ignores a plan on create for a non-Student-Loan type (stores null)", async () => {
      await service.createAccount("userA", {
        name: "Cash",
        type: "Current",
        balance: 10,
        currency: "GBP",
        studentLoanPlan: "PLAN_2",
      });
      expect(mockAccountRepo.create.mock.calls[0][0]).toMatchObject({ studentLoanPlan: null });
    });

    it("clears the plan when an update changes the type away from Student Loan", async () => {
      const existing = {
        id: "a1",
        userId: "userA",
        type: "Student Loan",
        studentLoanPlan: "PLAN_2",
      };
      mockAccountRepo.findOne.mockResolvedValueOnce(existing);
      await service.updateAccount("userA", "a1", { type: "Loan" });
      expect(mockAccountRepo.save.mock.calls[0][0]).toMatchObject({
        type: "Loan",
        studentLoanPlan: null,
      });
    });

    it("keeps the plan on an update that does not change the type", async () => {
      const existing = {
        id: "a1",
        userId: "userA",
        type: "Student Loan",
        studentLoanPlan: "PLAN_2",
      };
      mockAccountRepo.findOne.mockResolvedValueOnce(existing);
      await service.updateAccount("userA", "a1", { name: "Renamed" });
      expect(mockAccountRepo.save.mock.calls[0][0]).toMatchObject({ studentLoanPlan: "PLAN_2" });
    });
  });

  describe("mortgage term fields", () => {
    const mortgage = { name: "Home", type: "Mortgage", balance: 200000, currency: "GBP" };

    it("createAccount persists a valid termMonths and fixedRateEndDate", async () => {
      await service.createAccount("userA", {
        ...mortgage,
        termMonths: 300,
        fixedRateEndDate: "2028-02-29",
      });

      expect(mockAccountRepo.create.mock.calls[0][0]).toMatchObject({
        termMonths: 300,
        fixedRateEndDate: "2028-02-29",
      });
    });

    it("accepts the 1 and 600 bounds and explicit nulls, and allows them on any type", async () => {
      await service.createAccount("userA", { ...mortgage, termMonths: 1 });
      await service.createAccount("userA", { ...mortgage, termMonths: 600 });
      await service.createAccount("userA", {
        name: "Cash",
        type: "Saving",
        balance: 1,
        termMonths: null,
        fixedRateEndDate: null,
      });

      expect(mockAccountRepo.create.mock.calls[2][0]).toMatchObject({
        termMonths: null,
        fixedRateEndDate: null,
      });
    });

    it("omits the fields when not supplied so an update leaves them untouched", async () => {
      mockAccountRepo.findOne.mockResolvedValueOnce({ id: "a1", userId: "userA", termMonths: 240 });
      await service.updateAccount("userA", "a1", { balance: 5 });
      expect(mockAccountRepo.save.mock.calls.at(-1)[0]).toMatchObject({ termMonths: 240 });
    });

    it("updateAccount can clear both fields with null", async () => {
      mockAccountRepo.findOne.mockResolvedValueOnce({
        id: "a1",
        userId: "userA",
        termMonths: 240,
        fixedRateEndDate: "2030-01-01",
      });
      await service.updateAccount("userA", "a1", { termMonths: null, fixedRateEndDate: null });
      expect(mockAccountRepo.save.mock.calls.at(-1)[0]).toMatchObject({
        termMonths: null,
        fixedRateEndDate: null,
      });
    });

    it.each([0, -1, 601, 12.5, "300", Number.NaN])("rejects termMonths %s", async (termMonths) => {
      await expect(
        service.createAccount("userA", { ...mortgage, termMonths } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockAccountRepo.save).not.toHaveBeenCalled();
    });

    it.each(["2028-13-01", "2028-02-30", "01/02/2028", "2028-02-01T00:00:00Z", 20280201, ""])(
      "rejects fixedRateEndDate %s",
      async (fixedRateEndDate) => {
        await expect(
          service.createAccount("userA", { ...mortgage, fixedRateEndDate } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
        mockAccountRepo.findOne.mockResolvedValueOnce({ id: "a1", userId: "userA" });
        await expect(
          service.updateAccount("userA", "a1", { fixedRateEndDate } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockAccountRepo.save).not.toHaveBeenCalled();
      },
    );
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

    it.each(["checking", "current", "", null, 42])(
      "rejects account type %j on create and update, even without the contract",
      async (type) => {
        await expect(
          service.createAccount("userA", { ...valid, type } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
        mockAccountRepo.findOne.mockResolvedValueOnce({
          id: "a1",
          userId: "userA",
          type: "Saving",
        });
        await expect(service.updateAccount("userA", "a1", { type } as any)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(mockAccountRepo.save).not.toHaveBeenCalled();
      },
    );

    it("createAccount returns every account key, null where unset", async () => {
      const result = await service.createAccount("userA", valid as any);
      expect(result).toMatchObject({
        interestRate: null,
        monthlyContribution: null,
        termMonths: null,
        fixedRateEndDate: null,
        studentLoanPlan: null,
        connectionId: null,
        externalAccountId: null,
        isCurrent: true,
      });
    });

    it("createAccount defaults the currency to GBP when the body omits it", async () => {
      await service.createAccount("userA", { name: "Cash", type: "Saving", balance: 5 } as any);

      expect(mockAccountRepo.create.mock.calls[0][0]).toMatchObject({ currency: "GBP" });
    });

    it("updateAccount treats null or empty currency as unset and keeps the stored one", async () => {
      for (const currency of [null, ""]) {
        mockAccountRepo.findOne.mockResolvedValueOnce({
          id: "a1",
          userId: "userA",
          currency: "USD",
        });
        await service.updateAccount("userA", "a1", { balance: 9, currency } as any);
        const saved = mockAccountRepo.save.mock.calls.at(-1)[0];
        expect(saved).toMatchObject({ balance: 9, currency: "USD" });
      }
    });

    it("updateAccount looks the account up by id and caller, so another user gets 404", async () => {
      mockAccountRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.updateAccount("userB", "a1", { balance: 1 })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAccountRepo.findOne).toHaveBeenCalledWith({
        where: { id: "a1", userId: "userB" },
      });
      expect(mockAccountRepo.save).not.toHaveBeenCalled();
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

  describe("balance history (E23 D22, D23)", () => {
    const A = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c11";
    const B = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c22";
    const FOREIGN = "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c33";

    // 30 Jun 2026 23:30 UTC is 1 Jul 00:30 BST, so the UK month is already July.
    const withDate = async (iso: string, run: () => Promise<void>) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(iso));
      try {
        await run();
      } finally {
        vi.useRealTimers();
      }
    };

    const build = () => {
      const accounts = createInMemoryRepository([
        { id: A, userId: "userA", name: "Current", balance: 100 },
        { id: B, userId: "userA", name: "Saver", balance: 200 },
        { id: FOREIGN, userId: "userB", name: "Theirs", balance: 999 },
      ]);
      const details = createInMemoryRepository();
      const svc = new AccountIntakeService(
        accounts as any,
        details as any,
        mockUserProfileRepo,
        mockBankConnectionRepo,
      );
      return { svc, accounts, details };
    };

    it("updateAccount upserts the current month's history row when the balance changes", async () => {
      await withDate("2026-03-15T12:00:00Z", async () => {
        const { svc, details } = build();
        await svc.updateAccount("userA", A, { balance: 150 });
        await svc.updateAccount("userA", A, { balance: 175 });
        expect(details.rows).toEqual([
          expect.objectContaining({ accountId: A, year: 2026, month: 3, value: 175 }),
        ]);
      });
    });

    it("updateAccount writes no history when the balance is not part of the update", async () => {
      const { svc, details } = build();
      await svc.updateAccount("userA", A, { name: "Renamed" });
      expect(details.rows).toHaveLength(0);
    });

    it("uses the UK calendar month, not the UTC one", async () => {
      await withDate("2026-06-30T23:30:00Z", async () => {
        const { svc, details } = build();
        await svc.updateAccount("userA", A, { balance: 1 });
        expect(details.rows[0]).toMatchObject({ year: 2026, month: 7 });
      });
    });

    it("updateBalances sets every balance and writes one history row each", async () => {
      await withDate("2026-03-15T12:00:00Z", async () => {
        const { svc, accounts, details } = build();
        const result = await svc.updateBalances("userA", {
          balances: [
            { id: A, balance: 110.5 },
            { id: B, balance: -20 },
          ],
        });
        expect(result.map((a) => [a.id, a.balance])).toEqual([
          [A, 110.5],
          [B, -20],
        ]);
        expect(accounts.rows.find((r) => r.id === A)?.balance).toBe(110.5);
        expect(details.rows.map((r) => [r.accountId, r.month, r.value])).toEqual([
          [A, 3, 110.5],
          [B, 3, -20],
        ]);
      });
    });

    it("updateBalances 404s on a foreign or unknown id and writes nothing", async () => {
      for (const bad of [FOREIGN, "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c99"]) {
        const { svc, accounts, details } = build();
        await expect(
          svc.updateBalances("userA", {
            balances: [
              { id: A, balance: 1 },
              { id: bad, balance: 2 },
            ],
          }),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(accounts.save).not.toHaveBeenCalled();
        expect(details.rows).toHaveLength(0);
      }
    });

    it.each([
      ["no body", undefined],
      ["empty list", { balances: [] }],
      ["too many", { balances: Array.from({ length: 101 }, () => ({ id: A, balance: 1 })) }],
      ["non-uuid id", { balances: [{ id: "abc", balance: 1 }] }],
      ["string balance", { balances: [{ id: A, balance: "5" }] }],
      ["NaN balance", { balances: [{ id: A, balance: Number.NaN }] }],
      ["infinite balance", { balances: [{ id: A, balance: Number.POSITIVE_INFINITY }] }],
      [
        "duplicate id",
        {
          balances: [
            { id: A, balance: 1 },
            { id: A, balance: 2 },
          ],
        },
      ],
    ])("updateBalances rejects %s with 400", async (_label, body) => {
      const { svc, accounts } = build();
      await expect(svc.updateBalances("userA", body as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(accounts.save).not.toHaveBeenCalled();
    });

    it("matches an uppercase uuid to the stored lowercase id", async () => {
      const { svc } = build();
      const result = await svc.updateBalances("userA", {
        balances: [{ id: A.toUpperCase(), balance: 9 }],
      });
      expect(result[0]?.id).toBe(A);
    });

    it.each([
      ["string", "5"],
      ["null", null],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["huge", 1e10],
    ])("updateAccount rejects a %s balance with 400 and writes nothing", async (_l, balance) => {
      const { svc, accounts, details } = build();
      await expect(svc.updateAccount("userA", A, { balance } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(accounts.save).not.toHaveBeenCalled();
      expect(details.rows).toHaveLength(0);
    });

    it("refuses to run non-transactionally in production", async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        const { svc } = build();
        await expect(svc.updateAccount("userA", A, { balance: 1 })).rejects.toThrow(/manager/);
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it("accepts exactly 100 entries", async () => {
      const ids = Array.from(
        { length: 100 },
        (_, i) => `6f1c6a4e-5b0e-4a63-9d0a-${String(i).padStart(12, "0")}`,
      );
      const accounts = createInMemoryRepository(
        ids.map((id) => ({ id, userId: "userA", balance: 0 })),
      );
      const details = createInMemoryRepository();
      const svc = new AccountIntakeService(
        accounts as any,
        details as any,
        mockUserProfileRepo,
        mockBankConnectionRepo,
      );
      const result = await svc.updateBalances("userA", {
        balances: ids.map((id) => ({ id, balance: 1 })),
      });
      expect(result).toHaveLength(100);
      expect(details.rows).toHaveLength(100);
    });
  });
});
