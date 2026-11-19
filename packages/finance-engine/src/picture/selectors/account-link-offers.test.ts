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

  it("does not read a payment word as a plain savings name, or offer an unnamed row", () => {
    const isa = [account("Cash ISA", "Saving", 100)];
    expect(offersFor([row("Direct debit", 100, { category: "savings" })], isa)).toEqual([]);
    expect(offersFor([row("", 100, { category: "savings" })], isa)).toEqual([]);
    expect(offersFor([row("My savings", 100, { category: "savings" })], isa)).toHaveLength(1);
  });
});

describe("findBudgetAccountLinkOffers: names, categories and skipped rows", () => {
  it.each([
    "payments",
    "repayment",
    "repayments",
    "minimum",
    "min",
    "monthly",
    "bill",
    "direct",
    "debit",
    "dd",
    "my",
    "the",
    "for",
    "to",
    "into",
    "saving",
    "savings",
  ])("reads '%s' as a payment word beside the debt's name in a bills row", (word) => {
    // "Car loan <word>": the account's name plus one payment word, at the loan's £180.
    const copy = row(`Car loan ${word}`, 180);
    expect(offersFor([copy], [account("Car loan", "Loan", 180)]).map((o) => o.rowId)).toEqual([
      copy.id,
    ]);
  });

  it.each(["the", "into", "to", "for"])(
    "reads '%s' as a plain savings word, so '%s savings' is offered for any savings account",
    (word) => {
      const plain = row(`${word} savings`, 100, { category: "savings" });
      expect(offersFor([plain], [account("Cash ISA", "Saving", 100)]).map((o) => o.rowId)).toEqual([
        plain.id,
      ]);
    },
  );

  it("does not offer a savings row that mixes a plain word with another pot's name", () => {
    // "Holiday savings": "savings" is plain but "holiday" is not, and it does not name the ISA.
    expect(
      offersFor(
        [row("Holiday savings", 100, { category: "savings" })],
        [account("Cash ISA", "Saving", 100)],
      ),
    ).toEqual([]);
  });

  it("does not offer a bills row whose name shares only the first word of a two-word debt", () => {
    // "Car insurance" against "Car loan": "loan" is missing, so the row does not name the account.
    expect(offersFor([row("Car insurance", 180)], [account("Car loan", "Loan", 180)])).toEqual([]);
  });

  it("never matches an account whose name has no letters or digits", () => {
    // The account "--" has no words, so no row names it: not "--" itself, not a bare "Payment".
    const debt = [account("Loan", "Loan", 180, { name: "--" })];
    expect(offersFor([row("--", 180)], debt)).toEqual([]);
    expect(offersFor([row("Payment", 180)], debt)).toEqual([]);
  });

  it("offers a savings account only to a row in the savings category", () => {
    // Same plain name and amount as the first test, but the row sits under bills.
    expect(offersFor([row("Savings", 250)], [account("ISA", "Saving", 250)])).toEqual([]);
  });

  it("does not offer a debt for a savings-category row, even one that names it", () => {
    expect(
      offersFor(
        [row("Car loan", 180, { category: "savings" })],
        [account("Car loan", "Loan", 180)],
      ),
    ).toEqual([]);
  });

  it("never offers a pension contribution row, even a bills row that names the pension", () => {
    // A pension is neither a savings nor a debt link, so it is never a candidate.
    expect(offersFor([row("Pension", 200)], [account("Pension", "Pension", 200)])).toEqual([]);
  });

  it("with two equal debts, offers the one a debt row names", () => {
    const repay = row("Car loan", 180, { category: "debt" });
    const debts = [account("Car loan", "Loan", 180), account("Card", "Credit Card", 180)];
    expect(offersFor([repay], debts).map((o) => o.accountId)).toEqual(["Car loan"]);
    // A debt row that names neither has no single winner.
    expect(offersFor([row("Debts", 180, { category: "debt" })], debts)).toEqual([]);
  });

  it("does not offer an account linked to a line to another row that would match it", () => {
    const linked = row("Linked ISA", 250, {
      category: "savings",
      linkKind: "savings",
      linkAccountId: "ISA",
    });
    // "Savings" at £250 would match the ISA if it were free.
    expect(
      offersFor(
        [linked, row("Savings", 250, { category: "savings" })],
        [account("ISA", "Saving", 250)],
      ),
    ).toEqual([]);
  });

  it("skips an income row, a linked row and a row with a link kind, each on its own", () => {
    // Each row is a debt row at the loan's £180, so it would be offered but for its flag.
    const loan = [account("Loan", "Loan", 180)];
    expect(offersFor([row("Refund", 180, { category: "debt", isIncome: true })], loan)).toEqual([]);
    expect(offersFor([row("Rent", 180, { category: "debt", linked: "housing" })], loan)).toEqual(
      [],
    );
    expect(offersFor([row("Loan", 180, { category: "debt", linkKind: "debt" })], loan)).toEqual([]);
  });

  it("once an earlier row takes an account, a later row cannot", () => {
    // Two debt rows at £180 and one loan: only the first is offered, the second finds no candidate.
    const first = row("Loan", 180, { category: "debt" });
    const second = row("Loan again", 180, { category: "debt" });
    expect(offersFor([first, second], [account("Loan", "Loan", 180)]).map((o) => o.rowId)).toEqual([
      first.id,
    ]);
  });

  it("offers neither of two equal debts that the row names equally", () => {
    // Two loans both called "Loan" at £180: the row names both, so there is no single winner.
    const twins = [
      account("Loan A", "Loan", 180, { name: "Loan" }),
      account("Loan B", "Loan", 180, { name: "Loan" }),
    ];
    expect(offersFor([row("Loan", 180, { category: "debt" })], twins)).toEqual([]);
  });
});
