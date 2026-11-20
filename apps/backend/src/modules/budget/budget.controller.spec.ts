import {
  AddBudgetCategoryRequest,
  MAX_BUDGET_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_BUDGET_CATEGORIES,
} from "@flump/api-contract";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { BudgetController } from "./budget.controller";
import {
  BudgetService,
  FULL_SHARE_MESSAGE,
  LINKED_LINE_SHARE_MESSAGE,
  ZERO_SHARE_MESSAGE,
} from "./budget.service";

/** Test wiring (BE-13): the controller takes the service; the service takes the repositories. */
const budgetController = (
  budgetRepo: unknown,
  profileRepo: unknown,
  accountRepo: unknown = createInMemoryRepository(),
) =>
  new BudgetController(
    new BudgetService(budgetRepo as never, profileRepo as never, accountRepo as never),
  );

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

  it("serves no POST budget-entries/seed-defaults (system audit slice 9, DB-15: no caller)", () => {
    // RequestMethod: GET 0, POST 1, PUT 2, DELETE 3, PATCH 4.
    const proto = BudgetController.prototype as unknown as Record<string, object>;
    const routes = Object.getOwnPropertyNames(proto)
      .map((name) => proto[name])
      .filter((fn): fn is object => typeof fn === "function" && Reflect.hasMetadata("path", fn))
      .map((fn) => `${Reflect.getMetadata("method", fn)} ${Reflect.getMetadata("path", fn)}`);
    expect(routes).toContain("1 budget-entries/categories");
    expect(routes).not.toContain("1 budget-entries/seed-defaults");
    expect("seedDefaults" in BudgetService.prototype).toBe(false);
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

    it("refuses an unknown ownership or a share that is not a whole number up to 100", async () => {
      const { controller, budgetRepo } = entryController();
      const base = { category: "bills", name: "Energy", amount: 150 };
      await expect(
        controller.createBudgetEntry(req, { ...base, ownership: "shared" as never }),
      ).rejects.toThrow("ownership must be one of sole, joint");
      for (const sharePercent of [-1, 101, 33.5]) {
        await expect(
          controller.createBudgetEntry(req, { ...base, ownership: "joint", sharePercent }),
        ).rejects.toThrow("sharePercent must be an integer between 1 and 99, or null");
      }
      expect(budgetRepo.rows).toEqual([]);
    });

    it("refuses a joint share of 0 or 100, each saying what it means, and stores nothing", async () => {
      const { controller, budgetRepo } = entryController();
      const base = { category: "bills", name: "Energy", amount: 150, ownership: "joint" as const };
      const zero = controller.createBudgetEntry(req, { ...base, sharePercent: 0 });
      await expect(zero).rejects.toBeInstanceOf(BadRequestException);
      await expect(zero).rejects.toThrow(ZERO_SHARE_MESSAGE);
      const full = controller.createBudgetEntry(req, { ...base, sharePercent: 100 });
      await expect(full).rejects.toBeInstanceOf(BadRequestException);
      await expect(full).rejects.toThrow(FULL_SHARE_MESSAGE);
      expect(budgetRepo.rows).toEqual([]);
    });

    it("accepts a joint share of 1 and of 99, the ends of the range", async () => {
      const { controller } = entryController();
      const base = { category: "bills", name: "Energy", amount: 150, ownership: "joint" as const };
      expect(await controller.createBudgetEntry(req, { ...base, sharePercent: 1 })).toMatchObject({
        ownership: "joint",
        sharePercent: 1,
      });
      expect(
        await controller.createBudgetEntry(req, { ...base, name: "Water", sharePercent: 99 }),
      ).toMatchObject({ ownership: "joint", sharePercent: 99 });
    });

    it("refuses an update to a joint share of 100 and leaves the row as saved", async () => {
      const row = {
        id: "e1",
        userId: "u1",
        category: "bills",
        name: "Energy",
        amount: 150,
        ownership: "joint",
        sharePercent: 30,
      };
      const { controller, budgetRepo } = entryController([row]);
      await expect(controller.updateBudgetEntry(req, "e1", { sharePercent: 100 })).rejects.toThrow(
        FULL_SHARE_MESSAGE,
      );
      expect(budgetRepo.rows).toEqual([row]);
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

  describe("lines linked to an account (audit slice 5)", () => {
    const me = { user: { id: "u1" } };
    // Ids built at runtime: sample values, never real ones.
    const id = (label: string) => `00000000-0000-4000-8000-${label.padStart(12, "0")}`;
    const MY_SAVER = id("1");
    const MY_LOAN = id("2");
    const THEIR_SAVER = id("3");
    const MY_CURRENT = id("4");
    const accounts = () =>
      createInMemoryRepository([
        { id: MY_SAVER, userId: "u1", name: "Saver", type: "Saving" },
        { id: MY_LOAN, userId: "u1", name: "Car loan", type: "Loan" },
        { id: MY_CURRENT, userId: "u1", name: "Bank", type: "Current" },
        { id: THEIR_SAVER, userId: "u2", name: "Someone else's saver", type: "Saving" },
      ]);
    const setup = (rows: Record<string, unknown>[] = []) => {
      const budgetRepo = createInMemoryRepository(rows);
      return {
        budgetRepo,
        controller: budgetController(budgetRepo, createInMemoryRepository(), accounts()),
      };
    };
    const savingsLine = { category: "savings", name: "Saving each month", amount: 250 };

    it("creates a savings line linked to the caller's own account, storing no amount", async () => {
      const { controller } = setup();
      const line = await controller.createBudgetEntry(me, {
        ...savingsLine,
        linkKind: "savings",
        linkAccountId: MY_SAVER,
      });
      expect(line).toMatchObject({ amount: 0, linkKind: "savings", linkAccountId: MY_SAVER });
      const debt = await controller.createBudgetEntry(me, {
        category: "debt",
        name: "Car loan",
        amount: 180,
        linkKind: "debt",
        linkAccountId: MY_LOAN,
      });
      expect(debt).toMatchObject({ amount: 0, linkKind: "debt", linkAccountId: MY_LOAN });
    });

    it("refuses a share of its own on a take-home, savings or debt line, and stores nothing", async () => {
      const { budgetRepo, controller } = setup();
      const linkedBodies = [
        { ...savingsLine, linkKind: "savings" as const, linkAccountId: MY_SAVER },
        {
          category: "debt",
          name: "Car loan",
          amount: 180,
          linkKind: "debt" as const,
          linkAccountId: MY_LOAN,
        },
        {
          category: "income",
          name: "Pay",
          amount: 2000,
          isIncome: true,
          linkKind: "take_home" as const,
        },
      ];
      for (const body of linkedBodies) {
        const joint = controller.createBudgetEntry(me, { ...body, ownership: "joint" });
        await expect(joint).rejects.toBeInstanceOf(BadRequestException);
        await expect(joint).rejects.toThrow(LINKED_LINE_SHARE_MESSAGE);
        await expect(
          controller.createBudgetEntry(me, { ...body, ownership: "sole", sharePercent: 40 }),
        ).rejects.toThrow(LINKED_LINE_SHARE_MESSAGE);
      }
      expect(budgetRepo.rows).toEqual([]);
    });

    it("refuses joint on an update to a linked line and leaves it as saved", async () => {
      const { budgetRepo, controller } = setup();
      const line = await controller.createBudgetEntry(me, {
        ...savingsLine,
        linkKind: "savings",
        linkAccountId: MY_SAVER,
      });
      const before = { ...budgetRepo.rows[0] };
      await expect(
        controller.updateBudgetEntry(me, line.id, { ownership: "joint", sharePercent: 50 }),
      ).rejects.toThrow(LINKED_LINE_SHARE_MESSAGE);
      expect(budgetRepo.rows[0]).toEqual(before);
    });

    it("clears a joint row's share when it is linked to an account, and keeps it sole when unlinked", async () => {
      const { controller } = setup();
      const line = await controller.createBudgetEntry(me, {
        ...savingsLine,
        ownership: "joint",
        sharePercent: 40,
      });
      expect(line).toMatchObject({ ownership: "joint", sharePercent: 40 });
      const linked = await controller.updateBudgetEntry(me, line.id, {
        linkKind: "savings",
        linkAccountId: MY_SAVER,
      });
      // The account's share replaces the line's own.
      expect(linked).toMatchObject({ linkKind: "savings", ownership: "sole", sharePercent: null });
      const unlinked = await controller.updateBudgetEntry(me, line.id, {
        linkKind: null,
        linkAccountId: null,
        amount: 250,
      });
      expect(unlinked).toMatchObject({ linkKind: null, ownership: "sole", sharePercent: null });
    });

    it("keeps the share of a joint housing line when it is linked to the saved rent", async () => {
      const { controller } = setup();
      const rent = await controller.createBudgetEntry(me, {
        category: "housing",
        name: "Rent",
        amount: 1200,
        ownership: "joint",
        sharePercent: 50,
      });
      const linked = await controller.updateBudgetEntry(me, rent.id, { linkKind: "housing" });
      expect(linked).toMatchObject({ linkKind: "housing", ownership: "joint", sharePercent: 50 });
      const fresh = setup();
      const created = await fresh.controller.createBudgetEntry(me, {
        category: "housing",
        name: "Rent",
        amount: 0,
        linkKind: "housing",
        ownership: "joint",
        sharePercent: 30,
      });
      expect(created).toMatchObject({ linkKind: "housing", ownership: "joint", sharePercent: 30 });
    });

    it("refuses another user's account on create, as not found, and stores nothing", async () => {
      const { budgetRepo, controller } = setup();
      const attempt = controller.createBudgetEntry(me, {
        ...savingsLine,
        linkKind: "savings",
        linkAccountId: THEIR_SAVER,
      });
      await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
      await expect(attempt).rejects.toThrow("Account not found");
      expect(budgetRepo.rows).toEqual([]);
    });

    it("refuses another user's account when linking an existing line, and leaves it as saved", async () => {
      const { budgetRepo, controller } = setup();
      const line = await controller.createBudgetEntry(me, savingsLine);
      await expect(
        controller.updateBudgetEntry(me, line.id, {
          linkKind: "savings",
          linkAccountId: THEIR_SAVER,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(budgetRepo.rows[0]).toMatchObject({
        amount: 250,
        linkKind: null,
        linkAccountId: null,
      });
    });

    it("refuses moving a linked line onto another user's account, and keeps its own link", async () => {
      const { budgetRepo, controller } = setup();
      const line = await controller.createBudgetEntry(me, {
        ...savingsLine,
        linkKind: "savings",
        linkAccountId: MY_SAVER,
      });
      await expect(
        controller.updateBudgetEntry(me, line.id, { linkAccountId: THEIR_SAVER }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(budgetRepo.rows[0]).toMatchObject({ linkKind: "savings", linkAccountId: MY_SAVER });
    });

    it("refuses an account id that does not exist at all, the same way", async () => {
      const { controller } = setup();
      await expect(
        controller.createBudgetEntry(me, {
          ...savingsLine,
          linkKind: "savings",
          linkAccountId: id("99"),
        }),
      ).rejects.toThrow("Account not found");
    });

    it("refuses a link that does not fit: no account, the wrong account type or the wrong line", async () => {
      const { controller } = setup();
      await expect(
        controller.createBudgetEntry(me, { ...savingsLine, linkKind: "savings" }),
      ).rejects.toThrow("Choose the account this line uses");
      await expect(
        controller.createBudgetEntry(me, {
          ...savingsLine,
          linkKind: "savings",
          linkAccountId: MY_LOAN,
        }),
      ).rejects.toThrow("Only a savings or investment account can be used for a savings line");
      await expect(
        controller.createBudgetEntry(me, {
          category: "debt",
          name: "Bank",
          amount: 0,
          linkKind: "debt",
          linkAccountId: MY_CURRENT,
        }),
      ).rejects.toThrow("Only a card, loan or overdraft can be used for a debt line");
      await expect(
        controller.createBudgetEntry(me, {
          category: "bills",
          name: "Saver",
          amount: 0,
          linkKind: "savings",
          linkAccountId: MY_SAVER,
        }),
      ).rejects.toThrow("Only a line in Savings can use an account's monthly saving");
      await expect(
        controller.createBudgetEntry(me, {
          category: "savings",
          name: "Pay",
          amount: 0,
          isIncome: true,
          linkKind: "savings",
          linkAccountId: MY_SAVER,
        }),
      ).rejects.toThrow("Only a line in Savings can use an account's monthly saving");
    });

    it("refuses an account on a line that is not a savings or debt line", async () => {
      const { controller } = setup();
      await expect(
        controller.createBudgetEntry(me, { ...savingsLine, linkAccountId: MY_SAVER }),
      ).rejects.toThrow("Only a savings or debt line can be linked to an account");
      await expect(
        controller.createBudgetEntry(me, {
          category: "income",
          name: "Pay",
          amount: 0,
          isIncome: true,
          linkKind: "take_home",
          linkAccountId: MY_SAVER,
        }),
      ).rejects.toThrow("Only a savings or debt line can be linked to an account");
    });

    it("refuses a second line on the same account", async () => {
      const { controller } = setup();
      await controller.createBudgetEntry(me, {
        ...savingsLine,
        linkKind: "savings",
        linkAccountId: MY_SAVER,
      });
      const other = await controller.createBudgetEntry(me, { ...savingsLine, name: "Again" });
      await expect(
        controller.updateBudgetEntry(me, other.id, {
          linkKind: "savings",
          linkAccountId: MY_SAVER,
        }),
      ).rejects.toThrow("Another line already uses this account");
    });

    it("unlinks with the figure the line keeps, dropping the account", async () => {
      const { controller } = setup();
      const line = await controller.createBudgetEntry(me, {
        ...savingsLine,
        linkKind: "savings",
        linkAccountId: MY_SAVER,
      });
      const unlinked = await controller.updateBudgetEntry(me, line.id, {
        linkKind: null,
        amount: 250,
      });
      expect(unlinked).toMatchObject({ amount: 250, linkKind: null, linkAccountId: null });
    });

    it("still renames a line whose account was deleted, leaving it linked and Not set", async () => {
      // The foreign key set link_account_id to null when the account went.
      const { controller } = setup([
        {
          id: id("50"),
          userId: "u1",
          category: "savings",
          name: "Old saver",
          amount: 0,
          linkKind: "savings",
          linkAccountId: null,
          ownership: "sole",
          sharePercent: null,
        },
      ]);
      const renamed = await controller.updateBudgetEntry(me, id("50"), { name: "Holiday saver" });
      expect(renamed).toMatchObject({
        name: "Holiday saver",
        linkKind: "savings",
        linkAccountId: null,
      });
      // Re-linking it checks the account as any link does.
      await expect(
        controller.updateBudgetEntry(me, id("50"), { linkAccountId: THEIR_SAVER }),
      ).rejects.toThrow("Account not found");
    });

    it("reads a racing write that hits the database guards as the plain errors", async () => {
      const { budgetRepo, controller } = setup();
      const line = await controller.createBudgetEntry(me, savingsLine);
      budgetRepo.save.mockRejectedValueOnce(
        Object.assign(new Error("duplicate key"), {
          driverError: { code: "23505", constraint: "UQ_budget_entries_link_account" },
        }),
      );
      await expect(
        controller.updateBudgetEntry(me, line.id, { linkKind: "savings", linkAccountId: MY_SAVER }),
      ).rejects.toThrow("Another line already uses this account");
      // The account was deleted between the check and the write: the composite foreign key fires.
      budgetRepo.save.mockRejectedValueOnce(
        Object.assign(new Error("foreign key"), {
          driverError: { code: "23503", constraint: "FK_budget_entries_link_account" },
        }),
      );
      await expect(
        controller.updateBudgetEntry(me, line.id, { linkKind: "savings", linkAccountId: MY_SAVER }),
      ).rejects.toBeInstanceOf(NotFoundException);
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
