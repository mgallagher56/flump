import { describe, expect, it, vi } from "vitest";
import { BudgetController } from "./budget.controller";

describe("BudgetController", () => {
  it("should be defined", () => {
    expect(BudgetController).toBeDefined();
  });

  it("should not seed default budget entries if user hasResetFinancialData is true", async () => {
    const mockBudgetRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      save: vi.fn(),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue({ hasResetFinancialData: true }),
    };

    const controller = new BudgetController(mockBudgetRepo as any, mockProfileRepo as any);
    const result = await controller.getBudgetEntries({ user: { id: "user-123" } });

    expect(result).toEqual([]);
    expect(mockBudgetRepo.save).not.toHaveBeenCalled();
  });

  it("should seed default budget entries if empty and not reset", async () => {
    const mockBudgetRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((e) => e),
      save: vi.fn((entries) => Promise.resolve(entries)),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    const controller = new BudgetController(mockBudgetRepo as any, mockProfileRepo as any);
    const result = await controller.getBudgetEntries({ user: { id: "user-123" } });

    expect(result.length).toBeGreaterThan(0);
    expect(mockBudgetRepo.save).toHaveBeenCalled();
  });

  it("should seed defaults on explicit request via seedDefaultBudgetEntries", async () => {
    const mockBudgetRepo = {
      find: vi.fn().mockResolvedValue([{ id: "entry-1", name: "Rent", amount: 1200 }]),
      create: vi.fn((e) => e),
      save: vi.fn((entries) => Promise.resolve(entries)),
    };
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue({ hasResetFinancialData: true }),
    };

    const controller = new BudgetController(mockBudgetRepo as any, mockProfileRepo as any);
    const result = await controller.seedDefaultBudgetEntries({ user: { id: "user-123" } });

    expect(mockBudgetRepo.save).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("should add custom category to user profile", async () => {
    const mockBudgetRepo = {};
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue({
        userId: "user-123",
        customBudgetCategories: ["subscriptions"],
      }),
      save: vi.fn((p) => Promise.resolve(p)),
    };

    const controller = new BudgetController(mockBudgetRepo as any, mockProfileRepo as any);
    const result = await controller.addCustomCategory(
      { user: { id: "user-123" } },
      { category: "Holidays" },
    );

    expect(result.success).toBe(true);
    expect(result.categories).toEqual(["subscriptions", "holidays"]);
  });
});
