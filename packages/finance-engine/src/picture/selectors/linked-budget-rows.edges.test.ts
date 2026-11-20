import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { figureKnown, figureUnknown } from "../figure.js";
import {
  accountFitsBudgetLink,
  BUDGET_ACCOUNT_LINK_CATEGORY,
  budgetRowLinkOf,
  listedBudgetEntries,
  withLinkedBudgetRows,
} from "./linked-budget-rows.js";
import type { TakeHome } from "./take-home.js";

// Edge cases of the linked lines: an income row linked to an account, the ids callers key on,
// further rows linked to a fact that is already read, and how listed entries map back.

const row = (over: Partial<BudgetEntryItem>): BudgetEntryItem => ({
  id: "r",
  category: "bills",
  name: "Row",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ...over,
});

const noTakeHome = figureUnknown<TakeHome>(["annualSalary"], "not-set");

const saver: RawAccount = {
  id: "saver",
  name: "Easy access saver",
  type: "Saving",
  balance: 10000,
  monthlyContribution: 500,
};

const resolve = (budget: BudgetEntryItem[], accounts: RawAccount[] = []) =>
  withLinkedBudgetRows(budget, {
    takeHome: noTakeHome,
    housing: null,
    accounts: new PortfolioSnapshot(accounts),
  });

describe("withLinkedBudgetRows: account lines", () => {
  it("gives a savings line the id linked:savings:<row id>", () => {
    const { rows } = resolve(
      [row({ id: "save", category: "savings", linkKind: "savings", linkAccountId: "saver" })],
      [saver],
    );
    expect(rows.map((r) => r.id)).toEqual(["linked:savings:save"]);
    // The line reads the account's £500 a month.
    expect(rows[0]?.amount).toBe(500);
  });

  it("reads Not set for an income row linked to a savings account", () => {
    // A saving is money going out, so an income row never reads it: the stored £0 is not used
    // and the line is Not set rather than the account's £500.
    const { rows } = resolve(
      [
        row({
          id: "odd",
          category: "income",
          isIncome: true,
          linkKind: "savings",
          linkAccountId: "saver",
        }),
      ],
      [saver],
    );
    expect(rows[0]).toMatchObject({ amount: 0, notSet: true, linkedRowId: "odd" });
  });
});

describe("withLinkedBudgetRows: a further row linked to a fact already read", () => {
  it("makes a second housing line Not set, as the person's own monthly line", () => {
    const first = row({ id: "h1", category: "housing", name: "Rent", linkKind: "housing" });
    const second = row({
      id: "h2",
      category: "housing",
      name: "Rent (old)",
      frequency: "annual",
      ownership: "joint",
      sharePercent: 50,
      isEssential: false,
      linkKind: "housing",
    });
    const { rows, shadowedRowIds } = resolve([first, second]);
    expect(rows[1]).toEqual({
      id: "linked:housing:h2",
      category: "housing",
      name: "Rent (old)",
      amount: 0,
      frequency: "monthly",
      isIncome: false,
      isEssential: false,
      ownership: "sole",
      sharePercent: null,
      sourceSharePercent: null,
      linked: "housing",
      linkedRowId: "h2",
      notSet: true,
    });
    expect(shadowedRowIds).toEqual(["h1", "h2"]);
  });

  it("makes a spending row linked to take-home pay Not set, with no income row chosen", () => {
    // Take-home is only chosen from income rows, so this row is a further take-home link.
    const { rows } = resolve([row({ id: "x", name: "Pay?", linkKind: "take_home" })]);
    expect(rows).toEqual([
      {
        id: "linked:take-home:x",
        category: "bills",
        name: "Pay?",
        amount: 0,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
        ownership: "sole",
        sharePercent: null,
        sourceSharePercent: null,
        linked: "take_home",
        linkedRowId: "x",
        notSet: true,
      },
    ]);
  });
});

describe("listedBudgetEntries", () => {
  it("lists an unlinked row as the caller's own entry, unchanged", () => {
    const callerEntry = row({ id: "food", name: "Groceries (anonymised)", amount: 300 });
    const listed = listedBudgetEntries([callerEntry], [row({ id: "food", amount: 300 })]);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toBe(callerEntry);
  });

  it("leaves out an unlinked row the caller has no entry for", () => {
    const callerEntry = row({ id: "food", amount: 300 });
    const listed = listedBudgetEntries(
      [callerEntry],
      [row({ id: "food", amount: 300 }), row({ id: "stray", amount: 50 })],
    );
    expect(listed).toEqual([callerEntry]);
  });
});

const takeHome = (monthly: number) =>
  figureKnown<TakeHome>({
    monthly,
    annual: monthly * 12,
    incomeTax: 0,
    nationalInsurance: 0,
    studentLoan: 0,
    pension: 0,
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
  });

describe("the stored link kinds", () => {
  it("reads every stored link kind, and nothing else", () => {
    for (const kind of ["take_home", "housing", "savings", "debt"]) {
      expect(budgetRowLinkOf(kind)).toBe(kind);
    }
    for (const other of ["", "Savings", "pension", null, undefined, 1]) {
      expect(budgetRowLinkOf(other)).toBeNull();
    }
  });

  it("puts a savings line in the savings category and a debt line in the debt category", () => {
    // The backend refuses a link whose row is not in this category.
    expect(BUDGET_ACCOUNT_LINK_CATEGORY).toEqual({ savings: "savings", debt: "debt" });
  });

  it("lets a savings line read a savings or investment account only", () => {
    expect(accountFitsBudgetLink("savings", "Saving")).toBe(true);
    expect(accountFitsBudgetLink("savings", "Investment")).toBe(true);
    expect(accountFitsBudgetLink("savings", "Current")).toBe(false);
    expect(accountFitsBudgetLink("savings", "Loan")).toBe(false);
  });
});

describe("withLinkedBudgetRows: the lines the engine adds", () => {
  it("adds nothing to an empty budget, with no shadowed rows and no offers", () => {
    expect(withLinkedBudgetRows([], { takeHome: takeHome(2500), housing: null })).toEqual({
      rows: [],
      shadowedRowIds: [],
      offers: [],
    });
  });

  it("adds the take-home line as the person's own essential monthly income", () => {
    const { rows } = withLinkedBudgetRows([row({ id: "bill", amount: 100 })], {
      takeHome: takeHome(2500),
      housing: null,
    });
    expect(rows[0]).toEqual({
      id: "linked:take-home",
      category: "income",
      name: "Take-home pay",
      amount: 2500,
      frequency: "monthly",
      isIncome: true,
      isEssential: true,
      ownership: "sole",
      sharePercent: null,
      sourceSharePercent: 100,
      linked: "take_home",
    });
  });

  it("treats a known take-home of £0 as not set", () => {
    // No income row: nothing is added. A linked income row: it reads Not set.
    const none = withLinkedBudgetRows([row({ id: "bill", amount: 100 })], {
      takeHome: takeHome(0),
      housing: null,
    });
    expect(none.rows.map((r) => r.id)).toEqual(["bill"]);
    expect(none.offers).toEqual([]);
    const linked = withLinkedBudgetRows(
      [row({ id: "pay", category: "income", isIncome: true, linkKind: "take_home" })],
      { takeHome: takeHome(0), housing: null },
    );
    expect(linked.rows[0]).toMatchObject({ notSet: true, amount: 0 });
  });

  it("adds the housing line as a monthly essential, beside an income row in the housing category", () => {
    // An income row in the housing category (say, a lodger's rent) is not a housing cost, so the
    // budget has no housing rows and the saved £900 rent is added as its own line.
    const { rows, offers } = withLinkedBudgetRows(
      [row({ id: "lodger", category: "housing", isIncome: true, amount: 400 })],
      {
        takeHome: figureUnknown<TakeHome>(["annualSalary"], "not-set"),
        housing: {
          kind: "rent",
          monthly: 900,
          paymentEstimated: false,
        },
      },
    );
    expect(offers).toEqual([]);
    expect(rows[1]).toEqual({
      id: "linked:housing",
      category: "housing",
      name: "Rent",
      amount: 900,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
      ownership: "sole",
      sharePercent: null,
      sourceSharePercent: 100,
      linked: "housing",
    });
  });
});
