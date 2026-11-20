import { MAX_BUDGET_CATEGORY_NAME_LENGTH } from "@flump/api-contract";
import { BUDGET_ACCOUNT_LINK_CATEGORY } from "@flump/finance-engine";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LINK_KIND_UNIQUE_INDEX } from "../../migrations/AddBudgetEntryLinkKind1795440000000";
import {
  LINK_ACCOUNT_FOREIGN_KEY,
  LINK_ACCOUNT_UNIQUE_INDEX,
} from "../../migrations/LinkBudgetLinesToAccounts1795490000000";
import { createInMemoryRepository } from "../../testing/in-memory-repository";
import { BudgetService } from "./budget.service";

const USER = "user-1";
const SAVER = "00000000-0000-4000-8000-0000000000a1";

const spending = { category: "groceries", name: "Food shop", amount: 300 };

const build = (
  budget = createInMemoryRepository(),
  accounts = createInMemoryRepository(),
  profiles = createInMemoryRepository(),
) => ({
  service: new BudgetService(budget as never, profiles as never, accounts as never),
  budget,
  accounts,
  profiles,
});

const caught = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: unknown) => e,
  );

describe("BudgetService.addCustomCategory", () => {
  it("refuses a name over the length limit even when the list is empty", async () => {
    const { service, profiles } = build();
    // The cap on the number of categories cannot be what refuses it: the user has none yet.
    await expect(
      service.addCustomCategory(USER, {
        category: "x".repeat(MAX_BUDGET_CATEGORY_NAME_LENGTH + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(profiles.save).not.toHaveBeenCalled();
  });
});

describe("BudgetService ownership and share (E34 C1)", () => {
  it("refuses an ownership value outside the contract's list", async () => {
    const { service, budget } = build();
    await expect(
      service.createEntry(USER, { ...spending, ownership: "shared" } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(budget.save).not.toHaveBeenCalled();
  });

  it("accepts a joint share at each end of 1 to 99 and refuses 0, 100, 101 and a fraction", async () => {
    const { service } = build();
    // A joint line keeps a whole-number share from 1 to 99 (E34 C1): 0% means none of the line is
    // the person's and 100% means all of it (mark it sole), so both ends are refused, as are values
    // outside 0 to 100 and fractions.
    const low = await service.createEntry(USER, {
      ...spending,
      ownership: "joint",
      sharePercent: 1,
    } as never);
    expect(low).toMatchObject({ ownership: "joint", sharePercent: 1 });
    const high = await service.createEntry(USER, {
      ...spending,
      ownership: "joint",
      sharePercent: 99,
    } as never);
    expect(high).toMatchObject({ ownership: "joint", sharePercent: 99 });
    for (const sharePercent of [0, 100, 101, 12.5]) {
      await expect(
        service.createEntry(USER, { ...spending, ownership: "joint", sharePercent } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});

describe("BudgetService savings and debt lines linked to an account", () => {
  const savingsCategory = BUDGET_ACCOUNT_LINK_CATEGORY.savings;
  const linkedRow = {
    id: "entry-1",
    userId: USER,
    category: savingsCategory,
    name: "Rainy day",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isEssential: false,
    linkKind: "savings",
    linkAccountId: SAVER,
    ownership: "sole",
    sharePercent: null,
  };
  const ownAccount = { id: SAVER, userId: USER, type: "Saving" };

  it("keeps the line's own account when the link kind is re-sent without one", async () => {
    const { service, budget } = build(
      createInMemoryRepository([linkedRow]),
      createInMemoryRepository([ownAccount]),
    );
    // Only a savings or debt line reads an account, so a savings kind with no account in the
    // body leaves the saved account in place. The line itself is the one row on that account,
    // which is not "another line".
    const saved = await service.updateEntry(
      USER,
      "entry-1",
      { linkKind: "savings" } as never,
      undefined,
    );
    expect(saved).toMatchObject({ linkKind: "savings", linkAccountId: SAVER });
    expect(budget.rows[0]).toMatchObject({ linkAccountId: SAVER });
  });

  it("still refuses an account another of the user's lines already uses", async () => {
    const { service } = build(
      createInMemoryRepository([linkedRow]),
      createInMemoryRepository([ownAccount]),
    );
    await expect(
      service.createEntry(USER, {
        category: savingsCategory,
        name: "Second saver line",
        amount: 0,
        linkKind: "savings",
        linkAccountId: SAVER,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("BudgetService when a write hits the database's own guard", () => {
  /** A Postgres error as TypeORM wraps it: code and constraint on the driver error only. */
  const pg = (code: string, constraint?: string) =>
    Object.assign(new Error("query failed"), { driverError: { code, constraint } });

  const failingCreate = async (err: unknown) => {
    const budget = createInMemoryRepository();
    vi.spyOn(budget, "save").mockRejectedValue(err as never);
    const { service } = build(budget);
    return caught(service.createEntry(USER, spending as never));
  };

  it("maps the one-line-per-fact index to a 400", async () => {
    expect(await failingCreate(pg("23505", LINK_KIND_UNIQUE_INDEX))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it("maps the one-line-per-account index to a 400", async () => {
    expect(await failingCreate(pg("23505", LINK_ACCOUNT_UNIQUE_INDEX))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it("maps the account foreign key to a 404, as for any account the caller does not have", async () => {
    expect(await failingCreate(pg("23503", LINK_ACCOUNT_FOREIGN_KEY))).toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns any other error unchanged", async () => {
    // A plain error with no code and no driver error at all.
    const plain = new Error("connection lost");
    expect(await failingCreate(plain)).toBe(plain);
    // A code with no constraint and no driver error.
    const bare = Object.assign(new Error("internal"), { code: "XX000" });
    expect(await failingCreate(bare)).toBe(bare);
    // The right codes on other constraints are not the link guards.
    const otherUnique = pg("23505", "UQ_something_else");
    expect(await failingCreate(otherUnique)).toBe(otherUnique);
    const otherForeignKey = pg("23503", "FK_something_else");
    expect(await failingCreate(otherForeignKey)).toBe(otherForeignKey);
    // A guard's name under another code is not that guard firing.
    for (const constraint of [
      LINK_ACCOUNT_FOREIGN_KEY,
      LINK_KIND_UNIQUE_INDEX,
      LINK_ACCOUNT_UNIQUE_INDEX,
    ]) {
      const notNull = pg("23502", constraint);
      expect(await failingCreate(notNull)).toBe(notNull);
    }
  });
});
