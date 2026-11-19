import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { budgetEntryFromRow } from "../build.js";
import { figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import { selectBudgetTotals } from "./budget-totals.js";
import { essentialCommitments } from "./commitments.js";
import { listedBudgetEntries, withLinkedBudgetRows } from "./linked-budget-rows.js";
import { selectMonthsOfCover } from "./months-of-cover.js";
import { selectSafeToSpend } from "./safe-to-spend.js";
import type { TakeHome } from "./take-home.js";

// Audit slice 5: budget lines linked to one savings or debt account (`link_account_id`).

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

const takeHome = (monthly: number) =>
  figureKnown<TakeHome>({
    monthly,
    annual: monthly * 12,
    incomeTax: 0,
    nationalInsurance: 0,
    studentLoan: 0,
    pension: 0,
    taxYear: "2026-27" as TakeHome["taxYear"],
    region: "ENGLAND_NI_WALES",
  });

const saver = (over: Partial<RawAccount> = {}): RawAccount => ({
  id: "saver",
  name: "Easy access saver",
  type: "Saving",
  balance: 10000,
  interestRate: 4,
  monthlyContribution: 500,
  ...over,
});

const loan = (over: Partial<RawAccount> = {}): RawAccount => ({
  id: "loan",
  name: "Car loan",
  type: "Loan",
  balance: 6000,
  interestRate: 7.9,
  monthlyContribution: 180,
  ...over,
});

/** A stored line linked to an account: amount stored as 0, never read. */
const savingsLine = (accountId: string | null, over: Partial<BudgetEntryItem> = {}) =>
  row({
    id: "save",
    category: "savings",
    name: "Saving each month",
    isEssential: false,
    linkKind: "savings",
    linkAccountId: accountId,
    ...over,
  });
const debtLine = (accountId: string | null, over: Partial<BudgetEntryItem> = {}) =>
  row({
    id: "repay",
    category: "debt",
    name: "Car loan payment",
    linkKind: "debt",
    linkAccountId: accountId,
    ...over,
  });

/** Resolves with no salary saved, so no take-home line joins the rows under test. */
const resolve = (budget: BudgetEntryItem[], accounts: RawAccount[]) =>
  withLinkedBudgetRows(budget, {
    takeHome: figureUnknown<TakeHome>(["annualSalary"], "not-set"),
    housing: null,
    accounts: new PortfolioSnapshot(accounts),
  });

describe("withLinkedBudgetRows: savings and debt lines (audit slice 5)", () => {
  it("a sole savings account: £500 saved a month is £500 in the budget", () => {
    const { rows, shadowedRowIds } = resolve(
      [row({ id: "pay", category: "income", isIncome: true, amount: 2000 }), savingsLine("saver")],
      [saver()],
    );
    const line = rows.find((r) => r.linked === "savings");
    expect(line).toMatchObject({
      amount: 500,
      linkedRowId: "save",
      linkAccountId: "saver",
      name: "Saving each month",
      category: "savings",
      ownership: "sole",
    });
    expect(shadowedRowIds).toEqual(["save"]);
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    // Income 2,000; savings 500; left over 2,000 - 500 = 1,500.
    expect(totals.value.savings).toBe(500);
    expect(totals.value.surplus).toBe(1500);
  });

  it("a joint savings account at 40%: £500 saved is £200 in the budget, the share applied once", () => {
    const { rows } = resolve(
      [savingsLine("saver")],
      [saver({ ownership: "joint", sharePercent: 40 })],
    );
    // 500 x 40% = 200. The line counts at 100% of that, never 200 x 40% = 80.
    expect(rows.find((r) => r.linked === "savings")).toMatchObject({
      amount: 200,
      ownership: "sole",
      sharePercent: null,
    });
  });

  it("ignores the share stored on the row itself: the account's share is the one that counts", () => {
    const { rows } = resolve(
      [savingsLine("saver", { ownership: "joint", sharePercent: 50 })],
      [saver({ ownership: "joint", sharePercent: 40 })],
    );
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    // 500 x 40% = 200, not 200 x 50% = 100.
    expect(totals.value.savings).toBe(200);
  });

  it("a sole loan: the £180 payment is the debt line and counts once in the commitments", () => {
    const snapshot = new PortfolioSnapshot([loan()]);
    const { rows } = withLinkedBudgetRows([debtLine("loan")], {
      takeHome: takeHome(2500),
      housing: null,
      accounts: snapshot,
    });
    expect(rows.find((r) => r.linked === "debt")?.amount).toBe(180);
    const commitments = essentialCommitments(rows, snapshot);
    // Account minimum 180 (stored), budgeted debt 180: max(180, 180) = 180, not 360.
    expect(commitments.accountMinimums).toBe(180);
    expect(commitments.budgetDebtPayments).toBe(180);
    expect(commitments.debtCommitment).toBe(180);
  });

  it("a joint card at 50%: the £300 payment is £150 in the line and in the commitments", () => {
    const card = loan({
      id: "card",
      name: "Joint card",
      type: "Credit Card",
      monthlyContribution: 300,
    });
    const snapshot = new PortfolioSnapshot([{ ...card, ownership: "joint", sharePercent: 50 }]);
    const { rows } = withLinkedBudgetRows([debtLine("card")], {
      takeHome: takeHome(2500),
      housing: null,
      accounts: snapshot,
    });
    // 300 x 50% = 150 on both sides, so max(150, 150) = 150.
    expect(rows.find((r) => r.linked === "debt")?.amount).toBe(150);
    expect(essentialCommitments(rows, snapshot).debtCommitment).toBe(150);
  });

  it("a saved £0 a month is a real £0, not Not set", () => {
    const { rows } = resolve([savingsLine("saver")], [saver({ monthlyContribution: 0 })]);
    const line = rows.find((r) => r.linked === "savings");
    expect(line?.amount).toBe(0);
    expect(line?.notSet).toBeUndefined();
  });

  it.each([
    ["the account was deleted (the foreign key cleared the id)", savingsLine(null), [saver()]],
    ["the account is not in the rows", savingsLine("gone"), [saver()]],
    ["no monthly amount is saved", savingsLine("saver"), [saver({ monthlyContribution: null })]],
    ["the account became a current account", savingsLine("saver"), [saver({ type: "Current" })]],
    ["a savings line on a debt account", savingsLine("loan"), [loan()]],
    [
      "a debt line on a mortgage",
      debtLine("mortgage"),
      [loan({ id: "mortgage", type: "Mortgage" })],
    ],
    ["a debt line on a student loan", debtLine("sl"), [loan({ id: "sl", type: "Student Loan" })]],
  ])("reads Not set, never the stored £0, when %s", (_label, line, accounts) => {
    const { rows } = resolve([row({ id: "bill", amount: 400 }), { ...line, amount: 75 }], accounts);
    const resolved = rows.find((r) => r.linked);
    expect(resolved).toMatchObject({ notSet: true, amount: 0, linkedRowId: line.id });
    // Every total that would count it is unknown, naming what is missing.
    expect(selectBudgetTotals(rows)).toEqual({
      status: "unknown",
      missing: ["linkedAccountMonthly"],
      reason: "not-set",
    });
  });

  it("reads Not set without the accounts to resolve it", () => {
    const { rows } = withLinkedBudgetRows([savingsLine("saver")], {
      takeHome: figureUnknown<TakeHome>(["annualSalary"], "not-set"),
      housing: null,
    });
    expect(rows[0]?.notSet).toBe(true);
  });

  it("a second line on the same account is Not set, so the saving never counts twice", () => {
    const { rows } = resolve(
      [savingsLine("saver"), savingsLine("saver", { id: "save-2", name: "Again" })],
      [saver()],
    );
    expect(rows.map((r) => [r.linkedRowId, r.amount, r.notSet ?? false])).toEqual([
      ["save", 500, false],
      ["save-2", 0, true],
    ]);
  });

  it("never adds a savings or debt line on its own", () => {
    const { rows, offers } = resolve([row({ id: "bill", amount: 400 })], [saver(), loan()]);
    expect(rows.map((r) => r.id)).toEqual(["bill"]);
    expect(offers).toEqual([]);
  });

  it("maps the stored link_account_id from an API row", () => {
    expect(
      budgetEntryFromRow({ id: "x", linkKind: "debt", linkAccountId: "loan", amount: "0" }),
    ).toMatchObject({ linkKind: "debt", linkAccountId: "loan" });
    expect(
      budgetEntryFromRow({ id: "y", linkKind: "debt", linkAccountId: null }),
    ).not.toHaveProperty("linkAccountId");
  });

  it("lists the line through the caller's copy of its saved entry, with the account's figure", () => {
    const saved = savingsLine("saver", { name: "ISA top-up", notes: "kept" });
    const { rows } = resolve([saved], [saver()]);
    expect(listedBudgetEntries([saved], rows)).toEqual([
      expect.objectContaining({ id: "save", name: "ISA top-up", notes: "kept", amount: 500 }),
    ]);
  });
});

describe("a budget with every kind of linked line, hand-worked (audit slice 5)", () => {
  // Take-home £2,500 (linked), rent £900 (linked), bills £300 typed, a saver at £500 a month and
  // a car loan at £180 a month (both linked), £100 of flexible spending. The saver is joint at
  // 40%; the loan is sole in one case and joint at 50% of a £360 payment in the other, which is
  // £180 either way, so both budgets have the same figures.
  const budget: BudgetEntryItem[] = [
    row({ id: "pay", category: "income", isIncome: true, linkKind: "take_home" }),
    row({ id: "rent", category: "housing", name: "Rent", linkKind: "housing" }),
    row({ id: "bills", amount: 300 }),
    savingsLine("saver"),
    debtLine("loan"),
    row({ id: "fun", category: "expenses", amount: 100, isEssential: false }),
  ];
  const cases: Array<[string, RawAccount]> = [
    ["sole loan", loan()],
    ["joint loan at 50%", loan({ monthlyContribution: 360, ownership: "joint", sharePercent: 50 })],
  ];

  it.each(cases)("%s: totals, commitments, safe to spend and Breathing room", (_label, debt) => {
    const snapshot = new PortfolioSnapshot([saver({ ownership: "joint", sharePercent: 40 }), debt]);
    const { rows } = withLinkedBudgetRows(budget, {
      takeHome: takeHome(2500),
      housing: { kind: "rent", monthly: 900, paymentEstimated: false },
      accounts: snapshot,
    });

    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    // Income 2,500. Essentials: rent 900 + bills 300 + loan 180 = 1,380. Savings: 500 x 40% = 200.
    // Discretionary 100. Left over: 2,500 - 1,380 - 100 - 200 = 820.
    expect(totals.value).toMatchObject({
      income: 2500,
      essentials: 1380,
      savings: 200,
      discretionary: 100,
      surplus: 820,
      debtPayments: 180,
    });

    const sts = selectSafeToSpend(takeHome(2500), rows, snapshot);
    if (!isFigureKnown(sts)) throw new Error("expected known");
    // Essentials less debt: 900 + 300 = 1,200. Debt: max(180 minimum, 180 budgeted) = 180.
    // Safe to spend: 2,500 - 1,200 - 180 - 200 = 920 a month, from the same 2,500 as left over.
    expect(sts.value.commitments.total).toBe(1380);
    expect(sts.value.monthly).toBe(920);
    expect(sts.value.incomeMonthly).toBe(totals.value.income);

    const cover = selectMonthsOfCover(rows, snapshot);
    if (!isFigureKnown(cover)) throw new Error("expected known");
    // Cash: the saver's 10,000 x 40% = 4,000. 4,000 / 1,380 = 2.898..., 2.9 months.
    expect(cover.value.liquidCash).toBe(4000);
    expect(cover.value.months).toBe(2.9);
  });
});
