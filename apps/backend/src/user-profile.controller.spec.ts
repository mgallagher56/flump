import { BadRequestException, Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserProfileController } from "./user-profile.controller";

describe("UserProfileController", () => {
  let controller: UserProfileController;
  let mockUserProfileRepo: any;
  let mockAccountRepo: any;
  let mockTransactionRepo: any;
  let mockAccountDetailRepo: any;
  let mockBankConnectionRepo: any;
  let mockBudgetEntryRepo: any;
  let mockTaxRecordRepo: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockUserProfileRepo = {
      findOne: vi.fn(),
      save: vi.fn((entity) => Promise.resolve({ id: "profile-1", ...entity })),
      create: vi.fn((entity) => ({ ...entity })),
    };
    mockAccountRepo = {
      find: vi.fn().mockResolvedValue([{ id: "acc-1", userId: "user-123" }]),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockTransactionRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 5 }),
    };
    mockAccountDetailRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    mockBankConnectionRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBudgetEntryRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 3 }),
    };
    mockTaxRecordRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 4 }),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue(null), // no workos api key in test mock
    };

    controller = new UserProfileController(
      mockUserProfileRepo,
      mockAccountRepo,
      mockTransactionRepo,
      mockAccountDetailRepo,
      mockBankConnectionRepo,
      mockBudgetEntryRepo,
      mockTaxRecordRepo,
      mockConfigService,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getUserProfile", () => {
    it("returns formatted profile and user email", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        displayName: "Jane Doe",
        firstName: "Jane",
        lastName: "Doe",
        annualSalary: "50000.00",
        monthlyTakeHome: "3200.00",
        hasResetFinancialData: false,
      });

      const result = await controller.getUserProfile({
        user: { id: "user-123", email: "jane@example.com" },
      });

      expect(result.userId).toBe("user-123");
      expect(result.displayName).toBe("Jane Doe");
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Doe");
      expect(result.email).toBe("jane@example.com");
      expect(result.annualSalary).toBe(50000);
      expect(result.hasResetFinancialData).toBe(false);
    });
  });

  describe("updateUserProfile", () => {
    it("updates firstName, lastName, and displayName", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        displayName: "Old Name",
        firstName: "Old",
        lastName: "User",
      });

      const result = await controller.updateUserProfile(
        { user: { id: "user-123", email: "jane@example.com" } },
        {
          displayName: "Jane Smith",
          firstName: "Jane",
          lastName: "Smith",
        },
      );

      expect(mockUserProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "Jane Smith",
          firstName: "Jane",
          lastName: "Smith",
        }),
      );
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Smith");
      expect(result.email).toBe("jane@example.com");
    });
  });

  describe("resetFinancialData", () => {
    it("deletes all financial entities and resets profile financial settings", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        annualSalary: 80000,
        monthlyTakeHome: 4500,
        hasMortgage: true,
        hasResetFinancialData: false,
      });

      const res = await controller.resetFinancialData(
        { user: { id: "user-123", email: "jane@example.com" } },
        { confirmation: "RESET" },
      );

      expect(mockAccountRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-123" } }),
      );
      expect(mockAccountDetailRepo.delete).toHaveBeenCalled();
      expect(mockTransactionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockAccountRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockBankConnectionRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockBudgetEntryRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockTaxRecordRepo.delete).toHaveBeenCalledWith({ userId: "user-123" });

      expect(mockUserProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          annualSalary: null,
          monthlyTakeHome: null,
          hasMortgage: false,
          pensionPercent: 0,
          pensionEmployerPercent: 0,
          isSalarySacrifice: false,
          isSalarySacrificeEmployerNi: false,
          customBudgetCategories: [],
          hasResetFinancialData: true,
          onboardingCompleted: false,
        }),
      );
      expect(res.success).toBe(true);
      expect(res.profile.hasResetFinancialData).toBe(true);
      expect(res.profile.onboardingCompleted).toBe(false);
      expect(res.profile.pensionPercent).toBe(0);
      expect(res.profile.pensionEmployerPercent).toBe(0);
      expect(res.profile.customBudgetCategories).toEqual([]);
    });
  });

  describe("resetFinancialData confirmation and audit (security review)", () => {
    const req = { user: { id: "user-123", email: "jane@example.com" } };

    it.each([
      ["no body", undefined],
      ["an empty body", {}],
      ["the wrong phrase", { confirmation: "reset" }],
      ["a non-string phrase", { confirmation: true }],
    ])("rejects %s with a 400 and deletes nothing", async (_label, body) => {
      await expect(controller.resetFinancialData(req, body)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockAccountRepo.delete).not.toHaveBeenCalled();
      expect(mockTransactionRepo.delete).not.toHaveBeenCalled();
      expect(mockUserProfileRepo.save).not.toHaveBeenCalled();
    });

    it("logs one financial_data_reset event with the user id and row counts only", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "user-123",
        annualSalary: 80000,
        displayName: "Jane Smith",
      });
      const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

      await controller.resetFinancialData(req, { confirmation: "RESET", extra: 1 });

      const events = log.mock.calls
        .map(([message]) => JSON.stringify(message))
        .filter((m) => m.includes("financial_data_reset"));
      expect(events).toHaveLength(1);
      const event = JSON.parse(events[0]);
      expect(Object.keys(event).sort()).toEqual(["event", "removed", "userId"]);
      expect(event.userId).toBe("user-123");
      expect(event.removed).toEqual({
        accountDetails: 4,
        snapshotCheckins: 0,
        importBatches: 0,
        transactions: 5,
        accounts: 1,
        bankConnections: 1,
        budgetEntries: 3,
        taxRecords: 4,
      });
      expect(events[0]).not.toContain("jane@example.com");
      expect(events[0]).not.toContain("80000");
      expect(events[0]).not.toContain("Jane");
      log.mockRestore();
    });
  });

  describe("checklist, password reset, and default profile creation", () => {
    it("creates default profile when none exists on getUserProfile and updateUserProfile", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null);
      const createdProfile = await controller.getUserProfile({
        user: { id: "u-new", email: "new@example.com" },
      });
      expect(createdProfile.userId).toBe("u-new");
      expect(createdProfile.currency).toBe("GBP");

      mockUserProfileRepo.findOne.mockResolvedValueOnce(null);
      const updated = await controller.updateUserProfile(
        { user: { id: "u-new", email: "new@example.com" } },
        {
          currency: "GBP",
          country: "GB",
          employmentType: "employed",
          annualSalary: 60000,
          monthlyTakeHome: 3500,
          hasSecondIncome: true,
          secondIncomeMonthly: 500,
          hasRentalIncome: true,
          rentalIncomeMonthly: 1000,
          hasMortgage: true,
          mortgageType: "repayment",
          propertyOwnershipShare: 50,
          hasBuyToLet: true,
          buyToLetCount: 2,
          buyToLetPropertyValue: 300000,
          buyToLetMonthlyRental: 1200,
          buyToLetMortgageBalance: 150000,
          buyToLetMortgageRate: 4.5,
          buyToLetMortgageType: "interest-only",
          pensionPercent: 6,
          pensionEmployerPercent: 4,
          isSalarySacrifice: true,
          isSalarySacrificeEmployerNi: true,
          monthlySavingsTarget: 800,
          savingsAllocationMode: "pro_rata",
          savingsDefaultInterestRate: 4.5,
          enabledPages: ["accounts"],
          dashboardWidgets: ["accounts"],
          dashboardWidgetOrder: ["accounts"],
          dashboardWidgetSizes: { accounts: "wide" },
          dashboardWidgetConfig: {},
          customBudgetCategories: ["travel"],
          onboardingCompleted: true,
        },
      );
      expect(updated.annualSalary).toBe(60000);
      expect(updated.onboardingCompleted).toBe(true);
    });

    it("updates checklist steps (adding and removing)", async () => {
      mockUserProfileRepo.findOne.mockResolvedValueOnce(null);
      const added = await controller.updateChecklist(
        { user: { id: "u1" } },
        { step: "connect_bank", completed: true },
      );
      expect(added.setupChecklistCompletedSteps).toContain("connect_bank");

      mockUserProfileRepo.findOne.mockResolvedValueOnce({
        userId: "u1",
        setupChecklistCompletedSteps: ["connect_bank", "set_budget"],
      });
      const removed = await controller.updateChecklist(
        { user: { id: "u1" } },
        { step: "connect_bank", completed: false },
      );
      expect(removed.setupChecklistCompletedSteps).toEqual(["set_budget"]);
    });

    it("rejects sendPasswordReset (503) when no identity provider is configured", async () => {
      await expect(controller.sendPasswordReset({ user: { id: "u1" } })).rejects.toMatchObject({
        status: 503,
      });
    });
  });
});
