import {
  AddBudgetCategoryRequest,
  MAX_BUDGET_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_BUDGET_CATEGORIES,
} from "@flump/api-contract";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";

/** Test wiring (BE-13): the controller takes the service; the service takes the repositories. */
const budgetController = (budgetRepo: unknown, profileRepo: unknown) =>
  new BudgetController(new BudgetService(budgetRepo as never, profileRepo as never));

describe("BudgetController", () => {
  it("should be defined", () => {
    expect(BudgetController).toBeDefined();
  });

  it("getBudgetEntries returns [] for a new user and never saves", async () => {
    const budgetRepo = createInMemoryRepository();
    const profileRepo = createInMemoryRepository();
    const controller = budgetController(budgetRepo, profileRepo);

    const result = await controller.getBudgetEntries({ user: { id: "user-123" } });

    expect(result).toEqual([]);
    expect(budgetRepo.save).not.toHaveBeenCalled();
    expect(budgetRepo.create).not.toHaveBeenCalled();
    expect(budgetRepo.rows).toEqual([]);
  });

  it("seedDefaultBudgetEntries adds no empty suggestion rows (owner item 33a)", async () => {
    const budgetRepo = createInMemoryRepository();
    const controller = budgetController(budgetRepo, createInMemoryRepository());

    const result = await controller.seedDefaultBudgetEntries({ user: { id: "user-123" } });

    expect(result).toEqual([]);
    expect(budgetRepo.rows).toEqual([]);
    expect(budgetRepo.save).not.toHaveBeenCalled();
  });

  it("seedDefaultBudgetEntries returns the user's own entries unchanged", async () => {
    const budgetRepo = createInMemoryRepository([
      { id: "u1", userId: "user-123", name: "Gym", isDefault: false, amount: 99 },
    ]);
    const controller = budgetController(budgetRepo, createInMemoryRepository());

    const result = await controller.seedDefaultBudgetEntries({ user: { id: "user-123" } });

    expect(result.map((r) => r.name)).toEqual(["Gym"]);
    expect(budgetRepo.rows).toHaveLength(1);
  });

  it("should add custom category to user profile and validate input", async () => {
    const mockBudgetRepo = {};
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((p) => ({ ...p })),
      save: vi.fn((p) => Promise.resolve(p)),
    };

    const controller = budgetController(mockBudgetRepo, mockProfileRepo);

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

  it("caps custom categories at the contract's limit (audit L2)", async () => {
    const full = Array.from({ length: MAX_CUSTOM_BUDGET_CATEGORIES }, (_, i) => `cat ${i}`);
    const mockProfileRepo = {
      findOne: vi.fn().mockResolvedValue({ userId: "u1", customBudgetCategories: [...full] }),
      create: vi.fn((p) => ({ ...p })),
      save: vi.fn((p) => Promise.resolve(p)),
    };
    const controller = budgetController({}, mockProfileRepo);
    const req = { user: { id: "u1" } };

    await expect(controller.addCustomCategory(req, { category: "One more" })).rejects.toThrow(
      BadRequestException,
    );
    // Re-adding an existing category at the cap is still a no-op success.
    const again = await controller.addCustomCategory(req, { category: "CAT 0" });
    expect(again.categories).toHaveLength(MAX_CUSTOM_BUDGET_CATEGORIES);
    expect(mockProfileRepo.save).not.toHaveBeenCalled();
    // A name over the length limit is refused even with the contract off.
    await expect(
      controller.addCustomCategory(req, {
        category: "x".repeat(MAX_BUDGET_CATEGORY_NAME_LENGTH + 1),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      AddBudgetCategoryRequest.safeParse({
        category: "x".repeat(MAX_BUDGET_CATEGORY_NAME_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("creates, updates and deletes budget entries", async () => {
    const mockBudgetRepo = {
      findOne: vi.fn(),
      create: vi.fn((e) => ({ id: "e-new", ...e })),
      save: vi.fn((e) => Promise.resolve(e)),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const mockProfileRepo = {};
    const controller = budgetController(mockBudgetRepo, mockProfileRepo);
    const req = { user: { id: "u1" } };

    // Create
    const created = await controller.createBudgetEntry(req, {
      category: "housing",
      name: "Rent",
      amount: 1500,
    });
    expect(created.amount).toBe(1500);
    expect(created.frequency).toBe("monthly");

    // `title` is accepted as an alias for `name`; a missing name is a 400
    const aliased = await controller.createBudgetEntry(req, {
      category: "income",
      title: "Salary",
      amount: 10,
    });
    expect(aliased.name).toBe("Salary");
    await expect(
      controller.createBudgetEntry(req, { category: "income", amount: 10 }),
    ).rejects.toThrow(BadRequestException);

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

  describe("joint marker and share (E34 C1)", () => {
    const req = { user: { id: "u1" } };
    const entryController = (rows: Record<string, unknown>[] = []) => {
      const budgetRepo = createInMemoryRepository(rows);
      return { budgetRepo, controller: budgetController(budgetRepo, createInMemoryRepository()) };
    };

    it("stores a savings entry as not essential when the flag is left out (owner item 28)", async () => {
      const { controller } = entryController();
      const savings = await controller.createBudgetEntry(req, {
        category: "savings",
        name: "Emergency fund",
        amount: 200,
      });
      expect(savings).toMatchObject({ isEssential: false });
      const rent = await controller.createBudgetEntry(req, {
        category: "housing",
        name: "Rent",
        amount: 1200,
      });
      expect(rent).toMatchObject({ isEssential: true });
      const marked = await controller.createBudgetEntry(req, {
        category: "savings",
        name: "Pension top-up",
        amount: 100,
        isEssential: true,
      });
      expect(marked).toMatchObject({ isEssential: true });
    });

    it("links a row to a saved detail and unlinks it", async () => {
      const { controller } = entryController();
      const created = await controller.createBudgetEntry(req, {
        category: "income",
        name: "Paycheck",
        amount: 2000,
        isIncome: true,
      });
      const linked = await controller.updateBudgetEntry(req, created.id, {
        amount: 0,
        linkKind: "take_home",
      });
      expect(linked).toMatchObject({ amount: 0, linkKind: "take_home" });
      const unlinked = await controller.updateBudgetEntry(req, created.id, {
        amount: 2100,
        linkKind: null,
      });
      expect(unlinked).toMatchObject({ amount: 2100, linkKind: null });
    });

    it("stores no amount on a linked line, whatever amount is sent", async () => {
      const { controller } = entryController();
      const created = await controller.createBudgetEntry(req, {
        category: "income",
        name: "Paycheck",
        amount: 2000,
        isIncome: true,
      });
      const linked = await controller.updateBudgetEntry(req, created.id, {
        amount: 2000,
        linkKind: "take_home",
      });
      expect(linked).toMatchObject({ amount: 0, linkKind: "take_home" });
      // An amount sent while it stays linked is not stored either.
      const still = await controller.updateBudgetEntry(req, created.id, { amount: 1500 });
      expect(still).toMatchObject({ amount: 0, linkKind: "take_home" });
    });

    it("creates a line linked to a saved fact, storing no amount, and refuses a second", async () => {
      const { controller } = entryController();
      const added = await controller.createBudgetEntry(req, {
        category: "housing",
        name: "Rent",
        amount: 950,
        linkKind: "housing",
      });
      expect(added).toMatchObject({ amount: 0, linkKind: "housing" });
      await expect(
        controller.createBudgetEntry(req, {
          category: "housing",
          name: "Rent again",
          amount: 0,
          linkKind: "housing",
        }),
      ).rejects.toThrow("Another line already uses this saved figure");
      await expect(
        controller.createBudgetEntry(req, {
          category: "expenses",
          name: "Food",
          amount: 0,
          linkKind: "take_home",
        }),
      ).rejects.toThrow("Only an income line can use your take-home pay");
    });

    it("refuses a link that does not fit the line, or a second line for the same fact", async () => {
      const { controller } = entryController();
      const food = await controller.createBudgetEntry(req, {
        category: "expenses",
        name: "Food",
        amount: 300,
      });
      await expect(
        controller.updateBudgetEntry(req, food.id, { linkKind: "take_home" }),
      ).rejects.toThrow("Only an income line can use your take-home pay");
      await expect(
        controller.updateBudgetEntry(req, food.id, { linkKind: "housing" }),
      ).rejects.toThrow("Only a housing line can use your saved housing payment");
      const pay = await controller.createBudgetEntry(req, {
        category: "income",
        name: "Pay",
        amount: 2000,
        isIncome: true,
      });
      const bonus = await controller.createBudgetEntry(req, {
        category: "income",
        name: "Bonus",
        amount: 100,
        isIncome: true,
      });
      await controller.updateBudgetEntry(req, pay.id, { linkKind: "take_home" });
      await expect(
        controller.updateBudgetEntry(req, bonus.id, { linkKind: "take_home" }),
      ).rejects.toThrow("Another line already uses this saved figure");
    });

    it("gives the same plain error when a racing write hits the one-line-per-fact index", async () => {
      // Two requests both pass the read-then-write check; the database's unique index refuses the
      // second. It reads as the check's own message, a 400, never a 500.
      const { budgetRepo, controller } = entryController();
      const pay = await controller.createBudgetEntry(req, {
        category: "income",
        name: "Pay",
        amount: 2000,
        isIncome: true,
      });
      budgetRepo.save.mockRejectedValueOnce(
        Object.assign(new Error("duplicate key"), {
          driverError: { code: "23505", constraint: "UQ_budget_entries_user_link_kind" },
        }),
      );
      const attempt = controller.updateBudgetEntry(req, pay.id, { linkKind: "take_home" });
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow("Another line already uses this saved figure");
    });

    it("creates a sole entry with no share by default", async () => {
      const { controller } = entryController();
      const created = await controller.createBudgetEntry(req, {
        category: "housing",
        name: "Rent",
        amount: 1200,
      });
      expect(created).toMatchObject({ ownership: "sole", sharePercent: null });
    });

    it("stores 50 for a joint entry without a share, and keeps a given share", async () => {
      const { controller } = entryController();
      const half = await controller.createBudgetEntry(req, {
        category: "housing",
        name: "Rent",
        amount: 1200,
        ownership: "joint",
      });
      expect(half).toMatchObject({ ownership: "joint", sharePercent: 50 });
      const forty = await controller.createBudgetEntry(req, {
        category: "bills",
        name: "Energy",
        amount: 150,
        ownership: "joint",
        sharePercent: 40,
      });
      expect(forty).toMatchObject({ ownership: "joint", sharePercent: 40 });
    });

    it("drops a share sent with a sole entry", async () => {
      const { controller } = entryController();
      const created = await controller.createBudgetEntry(req, {
        category: "bills",
        name: "Energy",
        amount: 150,
        ownership: "sole",
        sharePercent: 40,
      });
      expect(created).toMatchObject({ ownership: "sole", sharePercent: null });
    });

    it("refuses an unknown ownership or a share outside 1 to 100, in the accounts wording", async () => {
      const { controller, budgetRepo } = entryController();
      const base = { category: "bills", name: "Energy", amount: 150 };
      await expect(
        controller.createBudgetEntry(req, { ...base, ownership: "shared" as never }),
      ).rejects.toThrow("ownership must be one of sole, joint");
      for (const sharePercent of [0, 101, 33.5]) {
        await expect(
          controller.createBudgetEntry(req, { ...base, ownership: "joint", sharePercent }),
        ).rejects.toThrow("sharePercent must be an integer between 1 and 100, or null");
      }
      expect(budgetRepo.rows).toEqual([]);
    });

    it("keeps ownership and share when an update leaves them out", async () => {
      const { controller } = entryController([
        {
          id: "e1",
          userId: "u1",
          name: "Rent",
          amount: 1200,
          ownership: "joint",
          sharePercent: 30,
        },
      ]);
      const updated = await controller.updateBudgetEntry(req, "e1", { amount: 1300 });
      expect(updated).toMatchObject({ amount: 1300, ownership: "joint", sharePercent: 30 });
    });

    it("updates to joint (50 when no share), changes the share, and back to sole", async () => {
      const { controller } = entryController([
        {
          id: "e1",
          userId: "u1",
          name: "Rent",
          amount: 1200,
          ownership: "sole",
          sharePercent: null,
        },
      ]);
      expect(await controller.updateBudgetEntry(req, "e1", { ownership: "joint" })).toMatchObject({
        ownership: "joint",
        sharePercent: 50,
      });
      expect(await controller.updateBudgetEntry(req, "e1", { sharePercent: 25 })).toMatchObject({
        ownership: "joint",
        sharePercent: 25,
      });
      expect(await controller.updateBudgetEntry(req, "e1", { sharePercent: null })).toMatchObject({
        ownership: "joint",
        sharePercent: 50,
      });
      expect(await controller.updateBudgetEntry(req, "e1", { ownership: "sole" })).toMatchObject({
        ownership: "sole",
        sharePercent: null,
      });
    });

    it("refuses a bad share on update and leaves the row as saved", async () => {
      const row = {
        id: "e1",
        userId: "u1",
        name: "Rent",
        amount: 1200,
        ownership: "joint",
        sharePercent: 30,
      };
      const { controller, budgetRepo } = entryController([row]);
      await expect(controller.updateBudgetEntry(req, "e1", { sharePercent: 0 })).rejects.toThrow(
        BadRequestException,
      );
      expect(budgetRepo.rows).toEqual([row]);
    });
  });

  it("has no reset route that re-seeds", () => {
    expect(
      (BudgetController.prototype as unknown as Record<string, unknown>).resetBudgetEntries,
    ).toBeUndefined();
  });

  it("scopes budget entries by owner: user B cannot list, update or delete user A's entry", async () => {
    const budgetRepo = createInMemoryRepository([
      { id: "e-A", userId: "userA", category: "housing", name: "Rent", amount: 1500 },
    ]);
    const profileRepo = createInMemoryRepository();
    const controller = budgetController(budgetRepo, profileRepo);
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
