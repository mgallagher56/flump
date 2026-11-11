import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BudgetController } from "./budget.controller";
import { createInMemoryRepository } from "./testing/in-memory-repository";

describe("BudgetController", () => {
  it("should be defined", () => {
    expect(BudgetController).toBeDefined();
  });

  it("getBudgetEntries returns [] for a new user and never saves", async () => {
    const budgetRepo = createInMemoryRepository();
    const profileRepo = createInMemoryRepository();
    const controller = new BudgetController(budgetRepo as any, profileRepo as any);

    const result = await controller.getBudgetEntries({ user: { id: "user-123" } });

    expect(result).toEqual([]);
    expect(budgetRepo.save).not.toHaveBeenCalled();
    expect(budgetRepo.create).not.toHaveBeenCalled();
    expect(budgetRepo.rows).toEqual([]);
  });

  it("seedDefaultBudgetEntries twice creates each template row once", async () => {
    const budgetRepo = createInMemoryRepository();
    const controller = new BudgetController(budgetRepo as any, createInMemoryRepository() as any);
    const req = { user: { id: "user-123" } };

    const first = await controller.seedDefaultBudgetEntries(req);
    const second = await controller.seedDefaultBudgetEntries(req);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toHaveLength(first.length);
    expect(budgetRepo.rows).toHaveLength(first.length);
    const names = budgetRepo.rows.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("seedDefaultBudgetEntries keeps user entries and skips only existing default templates", async () => {
    const budgetRepo = createInMemoryRepository([
      { id: "u1", userId: "user-123", name: "Gym", isDefault: false, amount: 99 },
      { id: "d1", userId: "user-123", name: "Gas", isDefault: true, amount: 61 },
    ]);
    const controller = new BudgetController(budgetRepo as any, createInMemoryRepository() as any);

    await controller.seedDefaultBudgetEntries({ user: { id: "user-123" } });

    expect(budgetRepo.rows.filter((r) => r.name === "Gas")).toHaveLength(1);
    expect(budgetRepo.rows.filter((r) => r.name === "Gym")).toHaveLength(2);
  });

  it("suggested defaults contain no income entry", async () => {
    const budgetRepo = createInMemoryRepository();
    const controller = new BudgetController(budgetRepo as any, createInMemoryRepository() as any);

    await controller.seedDefaultBudgetEntries({ user: { id: "user-123" } });

    expect(budgetRepo.rows).toHaveLength(14);
    expect(budgetRepo.rows.some((r) => r.isIncome || r.isPrimaryIncome)).toBe(false);
    expect(budgetRepo.rows.some((r) => r.name === "Salary (Take Home)")).toBe(false);
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

  it("creates, updates and deletes budget entries", async () => {
    const mockBudgetRepo = {
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
  });

  it("has no reset route that re-seeds", () => {
    expect((BudgetController.prototype as any).resetBudgetEntries).toBeUndefined();
  });

  it("scopes budget entries by owner: user B cannot list, update or delete user A's entry", async () => {
    const budgetRepo = createInMemoryRepository([
      { id: "e-A", userId: "userA", category: "housing", name: "Rent", amount: 1500 },
    ]);
    const profileRepo = createInMemoryRepository();
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
