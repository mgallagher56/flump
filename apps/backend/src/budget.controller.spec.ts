import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BudgetController } from "./budget.controller";
import { createInMemoryRepository } from "./testing/in-memory-repository";

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

  it("should add custom category to user profile and validate input", async () => {
    const mockBudgetRepo = {};
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((p) => ({ ...p })),
      save: vi.fn((p) => Promise.resolve(p)),
    };

    const controller = new BudgetController(mockBudgetRepo as any, mockProfileRepo as any);

    await expect(
      controller.addCustomCategory({ user: { id: "user-123" } }, { category: "  " }),
    ).rejects.toThrow(BadRequestException);

    const result = await controller.addCustomCategory(
      { user: { id: "user-123" } },
      { category: "Holidays" },
    );

    expect(result.success).toBe(true);
    expect(result.categories).toEqual(["holidays"]);
  });

  it("creates, updates, deletes, and resets budget entries", async () => {
    const mockBudgetRepo = {
      find: vi.fn().mockResolvedValue([{ id: "e1", amount: "100" }]),
      findOne: vi.fn(),
      create: vi.fn((e) => ({ id: "e-new", ...e })),
      save: vi.fn((e) => Promise.resolve(e)),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const mockProfileRepo = {};
    const controller = new BudgetController(mockBudgetRepo as any, mockProfileRepo as any);
    const req = { user: { id: "u1" } };

    // Create
    const created = await controller.createBudgetEntry(req, {
      category: "housing",
      name: "Rent",
      amount: 1500,
    });
    expect(created.amount).toBe(1500);
    expect(created.frequency).toBe("monthly");

    // Update not found & found
    mockBudgetRepo.findOne.mockResolvedValueOnce(null);
    await expect(controller.updateBudgetEntry(req, "missing", { amount: 200 })).rejects.toThrow(
      NotFoundException,
    );

    mockBudgetRepo.findOne.mockResolvedValueOnce({
      id: "e1",
      category: "housing",
      name: "Rent",
      amount: 1500,
    });
    const updated = await controller.updateBudgetEntry(req, "e1", {
      category: "bills",
      name: "Updated Rent",
      amount: 1600,
      frequency: "annual",
      isIncome: false,
      isEssential: true,
      notes: "note",
    });
    expect(updated.amount).toBe(1600);
    expect(updated.name).toBe("Updated Rent");

    // Delete not found & found
    mockBudgetRepo.findOne.mockResolvedValueOnce(null);
    await expect(controller.deleteBudgetEntry(req, "missing")).rejects.toThrow(NotFoundException);

    mockBudgetRepo.findOne.mockResolvedValueOnce({ id: "e1" });
    const delRes = await controller.deleteBudgetEntry(req, "e1");
    expect(delRes.success).toBe(true);

    // Reset
    const resetRes = await controller.resetBudgetEntries(req);
    expect(mockBudgetRepo.remove).toHaveBeenCalled();
    expect(resetRes.length).toBeGreaterThan(0);
  });

  it("scopes budget entries by owner: user B cannot list, update or delete user A's entry", async () => {
    const budgetRepo = createInMemoryRepository([
      { id: "e-A", userId: "userA", category: "housing", name: "Rent", amount: 1500 },
    ]);
    const profileRepo = createInMemoryRepository([
      { userId: "userB", hasResetFinancialData: true },
    ]);
    const controller = new BudgetController(budgetRepo as any, profileRepo as any);
    const userA = { user: { id: "userA" } };
    const userB = { user: { id: "userB" } };

    expect(await controller.getBudgetEntries(userB)).toEqual([]);
    await expect(controller.updateBudgetEntry(userB, "e-A", { amount: 1 })).rejects.toThrow(
      NotFoundException,
    );
    await expect(controller.deleteBudgetEntry(userB, "e-A")).rejects.toThrow(NotFoundException);

    expect(budgetRepo.rows).toEqual([
      { id: "e-A", userId: "userA", category: "housing", name: "Rent", amount: 1500 },
    ]);
    expect(await controller.getBudgetEntries(userA)).toHaveLength(1);
  });
});
