import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { essentialCommitments } from "./commitments.js";
import { findPossibleDuplicateDebtRows } from "./duplicate-debt-rows.js";

let nextId = 0;
const row = (
  name: string,
  amount: number,
  over: Partial<BudgetEntryItem> = {},
): BudgetEntryItem => ({
  id: `row-${++nextId}`,
  category: "bills",
  name,
  amount,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ...over,
});

const debt = (name: string, monthlyContribution?: number, type = "Loan"): RawAccount => ({
  id: `debt-${name}`,
  name,
  type,
  balance: -5000,
  interestRate: 7.9,
  monthlyContribution,
});

const find = (rows: BudgetEntryItem[], accounts: RawAccount[]) =>
  findPossibleDuplicateDebtRows(rows, new PortfolioSnapshot(accounts)).map(
    (c) => `${c.rowName} -> ${c.debtAccountName}`,
  );

describe("findPossibleDuplicateDebtRows", () => {
  it("finds a bills row named after a debt whose saved minimum is the same amount", () => {
    const rows = [row("Council tax", 190), row("Car loan payment", 265)];
    const snapshot = new PortfolioSnapshot([debt("Car loan", 265)]);
    expect(findPossibleDuplicateDebtRows(rows, snapshot)).toEqual([
      {
        rowId: rows[1]?.id,
        rowName: "Car loan payment",
        rowCategory: "bills",
        debtAccountId: "debt-Car loan",
        debtAccountName: "Car loan",
        monthlyAmount: 265,
      },
    ]);
  });

  it("changes no total: commitments are the same before and after it runs", () => {
    const rows = [row("Car loan payment", 265), row("Energy", 140)];
    const snapshot = new PortfolioSnapshot([debt("Car loan", 265)]);
    const before = essentialCommitments(rows, snapshot);
    findPossibleDuplicateDebtRows(rows, snapshot);
    expect(essentialCommitments(rows, snapshot)).toEqual(before);
    // Still counted in both places until the person moves the row to the debt category.
    expect(before.total).toBe(670);
  });

  it("ignores case and punctuation in the names", () => {
    expect(
      find([row("CREDIT-CARD payment", 60)], [debt("Credit card", 60, "Credit Card")]),
    ).toEqual(["CREDIT-CARD payment -> Credit card"]);
  });

  it("matches a weekly or annual row on its monthly amount", () => {
    expect(find([row("Car loan", 3180, { frequency: "annual" })], [debt("Car loan", 265)])).toEqual(
      ["Car loan -> Car loan"],
    );
  });

  describe("does not match", () => {
    it("an account called Car and a row called Car insurance for a different amount", () => {
      expect(find([row("Car insurance", 62)], [debt("Car", 265)])).toEqual([]);
    });

    it("part of a word: an account called Car and a row called Carpet cleaning", () => {
      expect(find([row("Carpet cleaning", 265)], [debt("Car", 265)])).toEqual([]);
    });

    it("only part of the account name: Car loan and a row called Car insurance", () => {
      expect(find([row("Car insurance", 265)], [debt("Car loan", 265)])).toEqual([]);
    });

    it("the same amount by coincidence under an unrelated name", () => {
      expect(find([row("Gym and swimming", 40)], [debt("Credit card", 40, "Credit Card")])).toEqual(
        [],
      );
    });

    it("the right name with a different amount, even by a penny", () => {
      expect(find([row("Car loan payment", 265.01)], [debt("Car loan", 265)])).toEqual([]);
      expect(find([row("Car loan payment", 300)], [debt("Car loan", 265)])).toEqual([]);
    });

    it("a debt whose minimum is an estimate because none is saved", () => {
      // Balance 5,000: the estimated minimum is 125. A row of 125 is not paired with a guess.
      expect(find([row("Car loan payment", 125)], [debt("Car loan")])).toEqual([]);
    });

    it("income, savings rows and rows already in the debt category", () => {
      const rows = [
        row("Car loan refund", 265, { isIncome: true }),
        row("Car loan pot", 265, { category: "savings" }),
        row("Car loan payment", 265, { category: "debt" }),
      ];
      expect(find(rows, [debt("Car loan", 265)])).toEqual([]);
    });

    it("an account that is not a debt", () => {
      const savings: RawAccount = {
        id: "isa",
        name: "Cash ISA",
        type: "Saving",
        balance: 10000,
        monthlyContribution: 100,
      };
      expect(find([row("Cash ISA", 100)], [savings])).toEqual([]);
    });
  });

  describe("two debts with the same minimum", () => {
    it("pairs the row with the debt it names, not the other one", () => {
      const accounts = [
        debt("Credit card", 40, "Credit Card"),
        debt("Store card", 40, "Credit Card"),
      ];
      expect(find([row("Store card payment", 40)], accounts)).toEqual([
        "Store card payment -> Store card",
      ]);
    });

    it("prefers the longer name when one debt's name is inside the other's", () => {
      const accounts = [debt("Car loan", 265), debt("Car loan 2", 265)];
      expect(find([row("Car loan 2 payment", 265)], accounts)).toEqual([
        "Car loan 2 payment -> Car loan 2",
      ]);
    });

    it("pairs nothing when two debts share the same name", () => {
      const first = debt("Credit card", 40, "Credit Card");
      const second = { ...debt("Credit card", 40, "Credit Card"), id: "debt-second" };
      expect(find([row("Credit card payment", 40)], [first, second])).toEqual([]);
    });
  });

  it("returns nothing with no budget rows or no debts", () => {
    expect(find([], [debt("Car loan", 265)])).toEqual([]);
    expect(find([row("Car loan payment", 265)], [])).toEqual([]);
  });
});
