import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot } from "../../portfolio.js";
import { buildFinancialPicture, financialPictureInputFromRows } from "../build.js";
import { figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import { selectBudgetTotals } from "./budget-totals.js";
import { selectHousingPayment } from "./housing-cost.js";
import {
  LINKED_HOUSING_ID,
  LINKED_TAKE_HOME_ID,
  withLinkedBudgetRows,
} from "./linked-budget-rows.js";
import type { TakeHome } from "./take-home.js";

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

const noTakeHome = figureUnknown<TakeHome>(["annualSalary"], "not-set");
const emptyProfile = financialPictureInputFromRows({}).profile;

describe("withLinkedBudgetRows: take-home pay (owner item 7)", () => {
  it("adds the take-home row when the budget has no pay row of its own", () => {
    // Profile take-home £2,500 a month; budget holds one £1,000 rent row.
    // Income = 2,500 (linked), essentials = 1,000, left over = 2,500 - 1,000 = 1,500.
    const { rows } = withLinkedBudgetRows(
      [row({ id: "rent", category: "housing", amount: 1000 })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows[0]).toMatchObject({ id: LINKED_TAKE_HOME_ID, amount: 2500, linked: "take-home" });
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value).toMatchObject({ income: 2500, essentials: 1000, surplus: 1500 });
  });

  it("lets a pay row the person typed win, under any synonym name", () => {
    // "Wages" £2,000 typed by the person: the profile's £2,500 is not added. Income = 2,000.
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [row({ id: "w", category: "income", name: "Wages", amount: 2000, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual(["w"]);
    expect(shadowedRowIds).toEqual([]);
  });

  it("stands in for a £0 pay row and leaves it out", () => {
    // A £0 "Salary" row is not a figure of the person's own: the linked £2,500 replaces it.
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [row({ id: "s", category: "income", name: "Salary", amount: 0, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_TAKE_HOME_ID]);
    expect(shadowedRowIds).toEqual(["s"]);
  });

  it("keeps other income alongside the linked row", () => {
    // Child Benefit £102 is not pay: income = 2,500 + 102 = 2,602.
    const { rows } = withLinkedBudgetRows(
      [row({ id: "cb", category: "income", name: "Child Benefit", amount: 102, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value.income).toBe(2602);
  });

  it.each(["Income", "Net income", "Monthly income", "Take-home", "Take home pay"])(
    "reads %s as the person's own pay",
    (name) => {
      // A typed £2,000 row under this name wins: the profile's £2,500 is not added. Income = 2,000.
      const { rows } = withLinkedBudgetRows(
        [row({ id: "p", category: "income", name, amount: 2000, isIncome: true })],
        { takeHome: takeHome(2500), housing: null },
      );
      expect(rows.map((r) => r.id)).toEqual(["p"]);
    },
  );

  it.each([
    "Partner's salary",
    "Spouse wages",
    "Husband's pay",
    "Wife's salary",
    "His wages",
    "Her salary",
    "Joint salary",
  ])("never reads %s as the person's own pay", (name) => {
    // £1,800 of someone else's pay plus the linked £2,500: income = 2,500 + 1,800 = 4,300.
    const { rows } = withLinkedBudgetRows(
      [row({ id: "o", category: "income", name, amount: 1800, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_TAKE_HOME_ID, "o"]);
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value.income).toBe(4300);
  });

  it("reads a row marked as main pay as the person's own, whatever its name", () => {
    // "From work" £2,200 marked as main pay wins over the profile's £2,500. Income = 2,200.
    const { rows } = withLinkedBudgetRows(
      [
        row({
          id: "fw",
          category: "income",
          name: "From work",
          amount: 2200,
          isIncome: true,
          isPrimaryIncome: true,
        }),
      ],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual(["fw"]);
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value.income).toBe(2200);
  });

  it("adds nothing without a known take-home", () => {
    const budget = [row({ id: "a", amount: 50 })];
    expect(withLinkedBudgetRows(budget, { takeHome: noTakeHome, housing: null }).rows).toEqual(
      budget,
    );
  });
});

describe("withLinkedBudgetRows: housing (owner item 33b)", () => {
  it("reads the saved rent in place of the budget's rent rows, where the first one sat", () => {
    // Saved rent £950. Budget: Council tax £150, "Rent / Mortgage" £0, "Rent" £900.
    // Both rent rows are left out; essentials = 150 + 950 = 1,100 (not 150 + 900 + 950).
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [
        row({ id: "ct", category: "housing", name: "Council tax", amount: 150 }),
        row({ id: "rm", category: "housing", name: "Rent / Mortgage", amount: 0 }),
        row({ id: "rent", category: "housing", name: "Rent", amount: 900 }),
      ],
      { takeHome: noTakeHome, housing: { kind: "rent", monthly: 950, paymentEstimated: false } },
    );
    expect(rows.map((r) => r.id)).toEqual(["ct", LINKED_HOUSING_ID]);
    expect(rows[1]).toMatchObject({ name: "Rent", amount: 950, isEssential: true });
    expect(shadowedRowIds).toEqual(["rm", "rent"]);
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value.essentials).toBe(1100);
  });

  it("names a mortgage payment and adds it when the budget has no housing row", () => {
    const { rows } = withLinkedBudgetRows([row({ id: "g", category: "expenses", amount: 300 })], {
      takeHome: noTakeHome,
      housing: { kind: "mortgage", monthly: 1234.56, paymentEstimated: true },
    });
    expect(rows).toEqual([
      expect.objectContaining({ id: "g" }),
      expect.objectContaining({ name: "Mortgage payment", amount: 1234.56 }),
    ]);
  });

  it("adds nothing to a budget with no rows, which stays unknown", () => {
    const linked = withLinkedBudgetRows([], {
      takeHome: takeHome(2500),
      housing: { kind: "rent", monthly: 950, paymentEstimated: false },
    });
    expect(linked.rows).toEqual([]);
    expect(selectBudgetTotals(linked.rows).status).toBe("unknown");
  });

  it("reads a pay word in a typed name as the person's own pay", () => {
    // "Salary (net)" £2,900 and "Rent received" £1,100: only the first is pay, so nothing is linked.
    const { rows } = withLinkedBudgetRows(
      [
        row({ id: "s", category: "income", name: "Salary (net)", amount: 2900, isIncome: true }),
        row({ id: "rr", category: "income", name: "Rent received", amount: 1100, isIncome: true }),
      ],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual(["s", "rr"]);
  });

  it("never reads a housing row with another name, such as Council tax", () => {
    const { shadowedRowIds } = withLinkedBudgetRows(
      [row({ id: "ct", category: "housing", name: "Council Tax", amount: 150 })],
      { takeHome: noTakeHome, housing: { kind: "rent", monthly: 950, paymentEstimated: false } },
    );
    expect(shadowedRowIds).toEqual([]);
  });

  it("lets a typed housing row win over the mortgage estimate, adding no linked row", () => {
    // Estimate £1,234.56 from the mortgage accounts. Typed "Mortgage" £600, joint at 50%.
    // The typed row wins: it counts 600 x 50% = 300. No linked row, so essentials = 300 (not
    // 300 + 1,234.56).
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [
        row({
          id: "m",
          category: "housing",
          name: "Mortgage",
          amount: 600,
          ownership: "joint",
          sharePercent: 50,
        }),
      ],
      {
        takeHome: noTakeHome,
        housing: { kind: "mortgage", monthly: 1234.56, paymentEstimated: true },
      },
    );
    expect(rows.map((r) => r.id)).toEqual(["m"]);
    expect(shadowedRowIds).toEqual([]);
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value.essentials).toBe(300);
  });

  it("puts the saved rent in place of a typed rent row", () => {
    // Saved rent £900, typed "Rent" £850. The saved figure is the person's own: the linked
    // £900 replaces the typed row, so essentials = 900 (not 850, and not 850 + 900 = 1,750).
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [row({ id: "rent", category: "housing", name: "Rent", amount: 850 })],
      { takeHome: noTakeHome, housing: { kind: "rent", monthly: 900, paymentEstimated: false } },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_HOUSING_ID]);
    expect(shadowedRowIds).toEqual(["rent"]);
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value.essentials).toBe(900);
  });

  it("adds the mortgage estimate when no housing row is typed, standing in for a £0 one", () => {
    // Estimate £1,234.56; the budget has Groceries £300 and a £0 "Mortgage" row. The £0 row is
    // not a figure of the person's own, so the estimate replaces it: essentials = 300 + 1,234.56
    // = 1,534.56.
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [
        row({ id: "g", category: "expenses", name: "Groceries", amount: 300 }),
        row({ id: "m", category: "housing", name: "Mortgage", amount: 0 }),
      ],
      {
        takeHome: noTakeHome,
        housing: { kind: "mortgage", monthly: 1234.56, paymentEstimated: true },
      },
    );
    expect(rows.map((r) => r.id)).toEqual(["g", LINKED_HOUSING_ID]);
    expect(shadowedRowIds).toEqual(["m"]);
    const totals = selectBudgetTotals(rows);
    if (!isFigureKnown(totals)) throw new Error("expected known");
    expect(totals.value.essentials).toBeCloseTo(1534.56, 2);
  });

  it("keeps the budget's own rent row while no housing payment is saved", () => {
    const budget = [row({ id: "rent", category: "housing", name: "Rent", amount: 900 })];
    expect(withLinkedBudgetRows(budget, { takeHome: noTakeHome, housing: null }).rows).toEqual(
      budget,
    );
  });
});

describe("selectHousingPayment", () => {
  const snapshot = new PortfolioSnapshot([]);
  it("reads the saved rent with no salary needed", () => {
    expect(
      selectHousingPayment(
        { ...emptyProfile, housingStatus: "renting", monthlyHousingCost: 950 },
        snapshot,
        [],
      ),
    ).toEqual({ kind: "rent", monthly: 950, paymentEstimated: false });
  });

  it("is null when nothing is saved", () => {
    expect(selectHousingPayment(emptyProfile, snapshot, [])).toBeNull();
  });
});

describe("buildFinancialPicture with linked rows", () => {
  it("counts the saved rent once and lists the rows it counts", () => {
    // Renting at £800 saved; budget has "Rent" £700 and Groceries £300 (essential).
    // Essentials = 800 + 300 = 1,100. Cash £3,300 / 1,100 = 3.0 months.
    const picture = buildFinancialPicture(
      financialPictureInputFromRows({
        profile: { housingStatus: "renting", monthlyHousingCost: 800 },
        accounts: [{ id: "cur", name: "Current", type: "Current", balance: 3300 }],
        budgetEntries: [
          { id: "rent", category: "housing", name: "Rent", amount: 700, isEssential: true },
          { id: "g", category: "expenses", name: "Groceries", amount: 300, isEssential: true },
        ],
      }),
    );
    expect(picture.shadowedBudgetRowIds).toEqual(["rent"]);
    expect(picture.budgetRows.map((r) => r.id)).toEqual([LINKED_HOUSING_ID, "g"]);
    if (!isFigureKnown(picture.budget) || !isFigureKnown(picture.monthsOfCover)) {
      throw new Error("expected known");
    }
    expect(picture.budget.value.essentials).toBe(1100);
    expect(picture.monthsOfCover.value.months).toBe(3);
  });
});
