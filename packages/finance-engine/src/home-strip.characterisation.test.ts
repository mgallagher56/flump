// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFinancialPicture, financialPictureInputFromRows } from "./picture/build.js";

/**
 * The figures Home's two-figure strip is built from, pinned from `buildFinancialPicture` before the
 * strip's rules moved into the engine (E12 S5b): the budget totals, the take-home and the consumer
 * debt total. Written and run against the unchanged engine first, so the split of the take-home
 * core and the new consumer debt selector are pinned to give the same figures in every case.
 */

const TAKE_HOME_ROW = {
  id: "row-take-home",
  category: "income",
  name: "Salary after tax",
  amount: 1,
  isIncome: true,
  linkKind: "take_home",
};
const RENT = { id: "row-rent", category: "housing", name: "Rent", amount: 950, isEssential: true };
const GROCERIES = {
  id: "row-groceries",
  category: "expenses",
  name: "Groceries",
  amount: 250,
  isEssential: true,
};
const EATING_OUT = { id: "row-eating-out", category: "expenses", name: "Eating out", amount: 90 };
const SAVINGS = { id: "row-savings", category: "savings", name: "Easy access", amount: 150 };
const SPENDING = [RENT, GROCERIES, EATING_OUT, SAVINGS];

const EMPLOYEE = {
  annualSalary: 36000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
};

const CURRENT = { id: "acc-current", name: "Current account", type: "Current", balance: 1200 };
const CARD = { id: "acc-card", name: "Credit card", type: "Credit Card", balance: 1800 };
const PENSION = { id: "acc-pension", name: "Workplace pension", type: "Pension", balance: 24000 };

interface Case {
  profile?: Record<string, unknown> | null;
  budgetEntries?: Record<string, unknown>[];
  accounts?: Record<string, unknown>[];
  /** The London date the picture is built on (the take-home reads the clock). */
  today?: string;
}

function stripFigures({
  profile = EMPLOYEE,
  budgetEntries = [],
  accounts = [CURRENT],
  today = "2026-11-27T12:00:00Z",
}: Case) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(today));
  const picture = buildFinancialPicture(
    financialPictureInputFromRows({
      profile: profile as never,
      accounts: accounts as never,
      budgetEntries,
    }),
    { asOf: new Date(today) },
  );
  return {
    budget: picture.budget,
    takeHome: picture.takeHome,
    totalDebt: picture.debtSummary?.totalDebt ?? null,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

const INCOME = {
  id: "row-income",
  category: "income",
  name: "Salary after tax",
  amount: 2085,
  isIncome: true,
};

/**
 * The employee's take-home in 2026/27. Pension 5% of 36,000 = 1,800 (net pay). Taxable
 * 36,000 - 1,800 - 12,570 = 21,630, tax 4,326. NI (36,000 - 12,570) x 8% = 1,874.40.
 * Take-home 36,000 - 1,800 - 4,326 - 1,874.40 = 27,999.60: 28,000 a year, 2,333 a month.
 */
const EMPLOYEE_TAKE_HOME_VALUE = {
  basis: "worked-out",
  monthly: 2333,
  annual: 28000,
  incomeTax: 4326,
  nationalInsurance: 1874.4,
  studentLoan: 0,
  pension: 1800,
  taxYear: "2026/27",
  region: "ENGLAND_NI_WALES",
};
const EMPLOYEE_TAKE_HOME = {
  status: "known",
  provenance: "derived",
  value: EMPLOYEE_TAKE_HOME_VALUE,
};

/**
 * The typed income row with the four spending rows: income 2,085; essentials 950 + 250 = 1,200;
 * discretionary 90; savings 150. Left over 2,085 - 1,200 - 90 - 150 = 645.
 */
const TYPED_INCOME_BUDGET = {
  status: "known",
  provenance: "derived",
  value: {
    income: 2085,
    essentials: 1200,
    savings: 150,
    discretionary: 90,
    outgoings: 1290,
    surplus: 645,
    debtPayments: 0,
    hasIncome: true,
    hasEssentials: true,
  },
};

/** The linked take-home of 2,333 with the same spending: 2,333 - 1,200 - 90 - 150 = 893. */
const LINKED_BUDGET_VALUE = { ...TYPED_INCOME_BUDGET.value, income: 2333, surplus: 893 };

describe("the strip's figures from the picture (characterisation)", () => {
  it("an employee with a linked take-home row", () => {
    expect(stripFigures({ budgetEntries: [TAKE_HOME_ROW, ...SPENDING] })).toEqual({
      budget: { status: "known", provenance: "derived", value: LINKED_BUDGET_VALUE },
      takeHome: EMPLOYEE_TAKE_HOME,
      totalDebt: null,
    });
  });

  it("self-employed, with a linked take-home row", () => {
    // Profit 40,000: tax (40,000 - 12,570) x 20% = 5,486; Class 4 NI 27,430 x 6% = 1,645.80.
    // Take-home 40,000 - 5,486 - 1,645.80 = 32,868.20: 32,868 a year, 2,739 a month.
    // Left over 2,739 - 1,200 - 90 - 150 = 1,299.
    expect(
      stripFigures({
        profile: {
          annualSalary: 40000,
          employmentType: "self-employed",
          taxRegion: "ENGLAND",
          studentLoanPlans: [],
          pensionPercent: 0,
        },
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
      }),
    ).toEqual({
      budget: {
        status: "known",
        provenance: "derived",
        value: { ...LINKED_BUDGET_VALUE, income: 2739, surplus: 1299 },
      },
      takeHome: {
        status: "known",
        provenance: "derived",
        value: {
          basis: "worked-out",
          monthly: 2739,
          annual: 32868,
          incomeTax: 5486,
          nationalInsurance: 1645.8,
          studentLoan: 0,
          pension: 0,
          taxYear: "2026/27",
          region: "ENGLAND_NI_WALES",
        },
      },
      totalDebt: null,
    });
  });

  it("a typed take-home read by the linked row", () => {
    // 2,085 typed as net pay: 2,085 x 12 = 25,020 a year. Left over 645, as the typed income.
    expect(
      stripFigures({
        profile: { monthlyTakeHome: 2085 },
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
      }),
    ).toEqual({
      budget: TYPED_INCOME_BUDGET,
      takeHome: {
        status: "known",
        provenance: "user",
        value: {
          basis: "typed",
          monthly: 2085,
          annual: 25020,
          incomeTax: null,
          nationalInsurance: null,
          studentLoan: null,
          pension: null,
          taxYear: null,
          region: null,
        },
      },
      totalDebt: null,
    });
  });

  it("no budget is unknown, never £0", () => {
    expect(stripFigures({})).toEqual({
      budget: { status: "unknown", missing: ["budget"], reason: "not-set" },
      takeHome: EMPLOYEE_TAKE_HOME,
      totalDebt: null,
    });
  });

  it("income only: the surplus is the whole income", () => {
    // 2,085 with nothing taken off.
    expect(stripFigures({ budgetEntries: [INCOME] })).toEqual({
      budget: {
        status: "known",
        provenance: "derived",
        value: {
          income: 2085,
          essentials: 0,
          savings: 0,
          discretionary: 0,
          outgoings: 0,
          surplus: 2085,
          debtPayments: 0,
          hasIncome: true,
          hasEssentials: false,
        },
      },
      takeHome: EMPLOYEE_TAKE_HOME,
      totalDebt: null,
    });
  });

  it("short: spending over income gives a negative surplus", () => {
    // Essentials 1,700 + 250 = 1,950; savings 150. 2,085 - 1,950 - 150 = -15.
    expect(
      stripFigures({ budgetEntries: [INCOME, { ...RENT, amount: 1700 }, GROCERIES, SAVINGS] }),
    ).toEqual({
      budget: {
        status: "known",
        provenance: "derived",
        value: {
          income: 2085,
          essentials: 1950,
          savings: 150,
          discretionary: 0,
          outgoings: 1950,
          surplus: -15,
          debtPayments: 0,
          hasIncome: true,
          hasEssentials: true,
        },
      },
      takeHome: EMPLOYEE_TAKE_HOME,
      totalDebt: null,
    });
  });

  it("no debts: no consumer debt total", () => {
    expect(stripFigures({ budgetEntries: [INCOME, ...SPENDING] })).toEqual({
      budget: TYPED_INCOME_BUDGET,
      takeHome: EMPLOYEE_TAKE_HOME,
      totalDebt: null,
    });
  });

  it("an overdraft account only is consumer debt", () => {
    // One Overdraft account owing 400: the total owed is 400.
    expect(
      stripFigures({
        accounts: [CURRENT, { id: "acc-od", name: "Overdraft", type: "Overdraft", balance: 400 }],
        budgetEntries: [INCOME, ...SPENDING],
      }),
    ).toEqual({ budget: TYPED_INCOME_BUDGET, takeHome: EMPLOYEE_TAKE_HOME, totalDebt: 400 });
  });

  it("an overdrawn current account alone gives no debt summary", () => {
    // The overdrawn 400 is counted in liabilities, but no debt item is made for it, so the
    // summary (and the strip's debt total) is absent.
    expect(
      stripFigures({
        accounts: [{ ...CURRENT, balance: -400 }],
        budgetEntries: [INCOME, ...SPENDING],
      }),
    ).toEqual({ budget: TYPED_INCOME_BUDGET, takeHome: EMPLOYEE_TAKE_HOME, totalDebt: null });
  });

  it("a credit card beside a pension is the debt total", () => {
    expect(
      stripFigures({ accounts: [CURRENT, CARD, PENSION], budgetEntries: [INCOME, ...SPENDING] }),
    ).toEqual({ budget: TYPED_INCOME_BUDGET, takeHome: EMPLOYEE_TAKE_HOME, totalDebt: 1800 });
  });

  it("a pension and no debt", () => {
    expect(
      stripFigures({ accounts: [CURRENT, PENSION], budgetEntries: [INCOME, ...SPENDING] }),
    ).toEqual({ budget: TYPED_INCOME_BUDGET, takeHome: EMPLOYEE_TAKE_HOME, totalDebt: null });
  });

  it("Scotland in 2027/28, with no Scottish rates, refuses the take-home and the budget is unknown", () => {
    expect(
      stripFigures({
        profile: { ...EMPLOYEE, taxRegion: "SCOTLAND" },
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        today: "2027-06-01T12:00:00Z",
      }),
    ).toEqual({
      budget: { status: "unknown", missing: ["annualSalary"], reason: "not-set" },
      takeHome: {
        status: "unknown",
        missing: [],
        reason: "rates-not-published",
        notice:
          "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
      },
      totalDebt: null,
    });
  });

  it("Plan 1 in 2027/28 is left out, and the budget says so", () => {
    // No published Plan 1 threshold for 2027/28: no repayment, so the take-home is the plain
    // employee's 2,333 (the 2027/28 allowance and bands are the same), and left over is 893.
    const notice =
      "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.";
    expect(
      stripFigures({
        profile: { ...EMPLOYEE, studentLoanPlans: ["PLAN_1"] },
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        today: "2027-06-01T12:00:00Z",
      }),
    ).toEqual({
      budget: {
        status: "known",
        provenance: "assumption",
        assumptions: [notice],
        value: LINKED_BUDGET_VALUE,
      },
      takeHome: {
        status: "known",
        provenance: "assumption",
        assumptions: [notice],
        value: { ...EMPLOYEE_TAKE_HOME_VALUE, taxYear: "2027/28" },
      },
      totalDebt: null,
    });
  });

  it("a date before the earliest supported year: the take-home is unknown, so is the budget", () => {
    expect(
      stripFigures({ budgetEntries: [TAKE_HOME_ROW, ...SPENDING], today: "2019-06-01T12:00:00Z" }),
    ).toEqual({
      budget: { status: "unknown", missing: ["annualSalary"], reason: "not-set" },
      takeHome: { status: "unknown", missing: [], reason: "unsupported-year" },
      totalDebt: null,
    });
  });

  it("a date after the latest supported year uses that year's rates", () => {
    // 1 June 2028 is in 2028/29; 2027/28 rates stand in, giving the same 2,333 and 893.
    expect(
      stripFigures({ budgetEntries: [TAKE_HOME_ROW, ...SPENDING], today: "2028-06-01T12:00:00Z" }),
    ).toEqual({
      budget: { status: "known", provenance: "derived", value: LINKED_BUDGET_VALUE },
      takeHome: {
        status: "known",
        provenance: "derived",
        value: { ...EMPLOYEE_TAKE_HOME_VALUE, taxYear: "2027/28" },
      },
      totalDebt: null,
    });
  });
});
