import { BadRequestException } from "@nestjs/common";
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

  describe("changePassword", () => {
    it("throws BadRequestException if password is shorter than 8 characters", async () => {
      await expect(
        controller.changePassword({ user: { id: "user-123" } }, { newPassword: "123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("succeeds when password is valid", async () => {
      const res = await controller.changePassword(
        { user: { id: "user-123" } },
        { newPassword: "securePassword123!" },
      );
      expect(res.success).toBe(true);
      expect(res.message).toBe("Password updated successfully");
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

      const res = await controller.resetFinancialData({
        user: { id: "user-123", email: "jane@example.com" },
      });

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
});
