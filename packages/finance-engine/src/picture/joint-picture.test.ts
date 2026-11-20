import { describe, expect, it } from "vitest";
import type { RawAccount } from "../portfolio.js";
import { calculateTargetFromBudgetLines } from "../retirement.js";
import { retirementBudgetLines } from "../retirement-input.js";
import { buildFinancialPicture, financialPictureInputFromRows } from "./build.js";
import { listedBudgetEntries } from "./selectors/linked-budget-rows.js";

/**
 * E34 C1: one person whose home, mortgage, a savings account and a budget line are joint. Every
 * total counts the person's share once. All figures are worked out by hand below.
 */
const accounts: RawAccount[] = [
  {
    id: "home",
    name: "Home",
    type: "Property",
    accountSubtype: "home",
    balance: 300000,
    ownership: "joint",
    sharePercent: 60,
  },
  {
    id: "mortgage",
    name: "Mortgage",
    type: "Mortgage",
    // Liabilities are stored negative.
    balance: -200000,
    monthlyContribution: 1000,
    interestRate: 4,
    termMonths: 240,
    linkedAccountId: "home",
    ownership: "joint",
    sharePercent: 60,
  },
  {
    id: "saver",
    name: "Joint saver",
    type: "Saving",
    balance: 10000,
    monthlyContribution: 200,
    ownership: "joint",
    sharePercent: 50,
  },
];

const budgetEntries = [
  {
    id: "pay",
    category: "income",
    name: "Salary",
    amount: 3000,
    isIncome: true,
    isEssential: true,
  },
  {
    id: "housing",
    category: "housing",
    name: "Mortgage",
    amount: 0,
    isEssential: true,
    linkKind: "housing",
  },
  {
    id: "food",
    category: "food",
    name: "Groceries",
    amount: 400,
    isEssential: true,
    ownership: "joint",
    sharePercent: 50,
  },
  {
    id: "save",
    category: "savings",
    name: "Joint saver",
    amount: 0,
    linkKind: "savings",
    linkAccountId: "saver",
  },
  { id: "fun", category: "entertainment", name: "Streaming", amount: 20, isEssential: false },
];

const input = financialPictureInputFromRows({
  profile: { housingStatus: "mortgage" },
  accounts,
  budgetEntries,
});
const picture = buildFinancialPicture(input, { asOf: new Date(Date.UTC(2026, 10, 20)) });

describe("a joint mortgage, a joint home and a joint budget line in one picture (E34 C1)", () => {
  it("counts net worth at the person's share of each joint account", () => {
    // Home 300,000 x 60% = 180,000. Saver 10,000 x 50% = 5,000. Assets 185,000.
    // Mortgage 200,000 x 60% = 120,000 owed. Net worth 185,000 - 120,000 = 65,000.
    expect(picture.netWorth.property).toBe(180000);
    expect(picture.netWorth.totalAssets).toBe(185000);
    expect(picture.netWorth.totalLiabilities).toBe(120000);
    expect(picture.netWorth.netWorth).toBe(65000);
  });

  it("takes the housing cost at the mortgage's share, once", () => {
    // The saved payment 1,000 x 60% = 600 a month.
    expect(picture.housingPayment).toEqual({
      kind: "mortgage",
      monthly: 600,
      paymentEstimated: false,
      sharePercent: 60,
    });
    // The housing cost's share of take-home pay reads this same payment; no salary is saved here,
    // so no tax figure enters this test.
  });

  it("counts each budget line at the person's share, and a linked line's share only once", () => {
    // Income 3,000 (sole). Essentials: housing line 600 (already at 60%, counted at 100%) plus
    // groceries 400 x 50% = 200, so 800. Savings: the saver's 200 x 50% = 100 (already at 50%).
    // Discretionary: streaming 20. Outgoings 800 + 20 = 820. Left over 3,000 - 820 - 100 = 2,080.
    expect(picture.budget.status).toBe("known");
    if (picture.budget.status !== "known") return;
    expect(picture.budget.value).toMatchObject({
      income: 3000,
      essentials: 800,
      savings: 100,
      discretionary: 20,
      outgoings: 820,
      surplus: 2080,
    });
  });

  it("starts Breathing room from the same shares", () => {
    // Income 3,000 less essentials 800 less planned savings 100, with no debt payments = 2,100.
    expect(picture.safeToSpend.status).toBe("known");
    if (picture.safeToSpend.status !== "known") return;
    expect(picture.safeToSpend.value.monthly).toBe(2100);
  });

  it("says which share each linked line was already taken at, for display only", () => {
    const listed = listedBudgetEntries(input.budget, picture.budgetRows);
    const byId = new Map(listed.map((row) => [row.linkedRowId ?? row.id, row]));
    expect(byId.get("housing")).toMatchObject({
      amount: 600,
      sourceSharePercent: 60,
      ownership: "sole",
    });
    expect(byId.get("save")).toMatchObject({
      amount: 100,
      sourceSharePercent: 50,
      ownership: "sole",
    });
    // An unlinked joint line keeps its own share, applied by the totals.
    expect(byId.get("food")).toMatchObject({ amount: 400, ownership: "joint", sharePercent: 50 });
  });

  it("counts the joint line at its share in Retirement's budget target (audit JO-4)", () => {
    // Groceries 400 x 50% = 200 plus streaming 20 = 220 a month; 220 x 12 = 2,640 a year.
    // Housing, income and savings lines are left out of this target.
    const lines = retirementBudgetLines(input.budget, accounts).map((line) => ({
      ...line,
      status: "continues" as const,
    }));
    const target = calculateTargetFromBudgetLines(lines);
    expect(target.monthlyAmount).toBe(220);
    expect(target.yearlyAmount).toBe(2640);
  });
});
