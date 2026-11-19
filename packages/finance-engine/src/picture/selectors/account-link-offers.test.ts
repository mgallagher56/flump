import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { findBudgetAccountLinkOffers } from "./account-link-offers.js";

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

const account = (
  id: string,
  type: string,
  monthlyContribution: number | null,
  over: Partial<RawAccount> = {},
): RawAccount => ({
  id,
  name: id,
  type,
  balance: 5000,
  interestRate: 5,
  monthlyContribution,
  ...over,
});

const offersFor = (budget: BudgetEntryItem[], accounts: RawAccount[]) =>
  findBudgetAccountLinkOffers(budget, new PortfolioSnapshot(accounts));

describe("findBudgetAccountLinkOffers (audit slice 5)", () => {
  it("offers a savings row equal to a savings account's monthly saving", () => {
    const savings = row("Savings", 250, { category: "savings" });
    expect(offersFor([savings], [account("ISA", "Saving", 250)])).toEqual([
      {
        rowId: savings.id,
        rowName: "Savings",
        rowCategory: "savings",
        link: "savings",
        accountId: "ISA",
        accountName: "ISA",
        monthly: 250,
      },
    ]);
  });

  it("compares at the person's share on both sides", () => {
    // Joint row: 400 x 50% = 200. Joint account: 500 x 40% = 200. Equal, so offered.
    const savings = row("Pot", 400, { category: "savings", ownership: "joint", sharePercent: 50 });
    const offers = offersFor(
      [savings],
      [account("Pot", "Saving", 500, { ownership: "joint", sharePercent: 40 })],
    );
    expect(offers.map((o) => [o.rowId, o.monthly])).toEqual([[savings.id, 200]]);
  });

  it("offers a debt row equal to a debt account's saved payment", () => {
    const repay = row("Loan", 180, { category: "debt" });
    expect(offersFor([repay], [account("Car loan", "Loan", 180)])[0]).toMatchObject({
      rowId: repay.id,
      link: "debt",
      accountId: "Car loan",
    });
  });

  it("offers a bills row that names the debt and is its payment (the old double count)", () => {
    const copy = row("Car loan payment", 180);
    expect(offersFor([copy], [account("Car loan", "Loan", 180)])[0]?.rowId).toBe(copy.id);
  });

  it("does not offer a bills row that only shares a word with the debt", () => {
    expect(offersFor([row("Car insurance", 180)], [account("Car", "Loan", 180)])).toEqual([]);
  });

  it("does not offer a savings row for a debt, or a debt row for a savings account", () => {
    expect(
      offersFor(
        [row("Savings", 180, { category: "savings" }), row("Debt", 250, { category: "debt" })],
        [account("Loan", "Loan", 180), account("ISA", "Saving", 250)],
      ),
    ).toEqual([]);
  });

  it("needs equal amounts to the penny, and a saved amount above £0", () => {
    expect(
      offersFor(
        [
          row("Savings", 250.01, { category: "savings" }),
          row("Debt", 0, { category: "debt" }),
          row("Other debt", 25, { category: "debt" }),
        ],
        // The card has no saved payment: its estimate is never matched.
        [
          account("ISA", "Saving", 250),
          account("Zero", "Loan", 0),
          account("Card", "Credit Card", null),
        ],
      ),
    ).toEqual([]);
  });

  it("skips income rows, linked rows and accounts already linked to a line", () => {
    const linked = row("Linked", 0, {
      category: "savings",
      linkKind: "savings",
      linkAccountId: "ISA",
    });
    expect(
      offersFor(
        [linked, row("Copy", 250, { category: "savings" }), row("Pay", 250, { isIncome: true })],
        [account("ISA", "Saving", 250)],
      ),
    ).toEqual([]);
  });

  it("offers each account once, to the first row in budget order", () => {
    const first = row("Savings", 100, { category: "savings" });
    const second = row("More savings", 100, { category: "savings" });
    expect(offersFor([first, second], [account("ISA", "Saving", 100)]).map((o) => o.rowId)).toEqual(
      [first.id],
    );
  });

  it("with two equal accounts, offers the one the row names, and none when it names neither", () => {
    const named = row("Holiday pot", 50, { category: "savings" });
    const unnamed = row("Savings", 50, { category: "savings" });
    const accounts = [account("Holiday pot", "Saving", 50), account("Rainy day", "Saving", 50)];
    expect(offersFor([named], accounts).map((o) => o.accountId)).toEqual(["Holiday pot"]);
    expect(offersFor([unnamed], accounts)).toEqual([]);
  });

  it("never offers a mortgage, a pension or a student loan", () => {
    expect(
      offersFor(
        [row("Mortgage", 900, { category: "debt" }), row("Pension", 200, { category: "savings" })],
        [account("Mortgage", "Mortgage", 900), account("Pension", "Pension", 200)],
      ),
    ).toEqual([]);
  });

  it("never offers a savings row that names something else, even at the same amount", () => {
    expect(
      offersFor(
        [row("Holiday fund", 100, { category: "savings" })],
        [account("Cash ISA", "Saving", 100)],
      ),
    ).toEqual([]);
    // A name with other words is not offered; the account's own name, or a plain one, is.
    expect(
      offersFor(
        [row("Cash ISA top-up", 100, { category: "savings" })],
        [account("Cash ISA", "Saving", 100)],
      ),
    ).toEqual([]);
    expect(
      offersFor(
        [row("Cash ISA", 100, { category: "savings" })],
        [account("Cash ISA", "Saving", 100)],
      ),
    ).toHaveLength(1);
    expect(
      offersFor(
        [row("Monthly saving", 100, { category: "savings" })],
        [account("Cash ISA", "Saving", 100)],
      ),
    ).toHaveLength(1);
  });
});
