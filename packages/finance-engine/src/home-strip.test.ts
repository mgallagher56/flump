// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  budgetCountsWorkedOutTakeHome,
  budgetHasSpending,
  budgetLeavesOut,
  budgetRefusalNotice,
  budgetSurplusOrNull,
  type HomeStripBudget,
  type HomeStripFacts,
  homeStripBudget,
  selectHomeStrip,
  selectHomeStripFromRows,
} from "./home-strip.js";
import { buildFinancialPicture, financialPictureInputFromRows } from "./picture/build.js";
import { figureKnown, figureRefused, figureUnknown } from "./picture/figure.js";
import type { BudgetTotals } from "./picture/selectors/budget-totals.js";
import type { TakeHome } from "./picture/selectors/take-home.js";
import { getUkTaxYearContext, type UkTaxYearContext } from "./uk-tax-year-calendar.js";

const KNOWN: Extract<HomeStripBudget, { status: "known" }> = {
  status: "known",
  income: 2085,
  surplus: 645,
  hasIncome: true,
  hasSpending: true,
  leavesOut: null,
};
const FACTS: HomeStripFacts = { budget: KNOWN, consumerDebt: null, pensionPot: null };

const CURRENT_YEAR: UkTaxYearContext = {
  calendarYear: "2026/27",
  ratesYear: "2026/27",
  isFallback: false,
};
const PROVISIONAL: UkTaxYearContext = {
  calendarYear: "2027/28",
  ratesYear: "2027/28",
  isFallback: false,
  kind: "provisional",
};
const FALLBACK: UkTaxYearContext = {
  calendarYear: "2028/29",
  ratesYear: "2027/28",
  isFallback: true,
  reason: "after-latest-supported",
};

describe("selectHomeStrip: the first card", () => {
  it("left over from the budget, with what it leaves out", () => {
    expect(selectHomeStrip({ ...FACTS, budget: { ...KNOWN, leavesOut: "No Plan 1." } })).toEqual({
      first: { kind: "leftOver", figure: 645, leavesOut: "No Plan 1." },
      second: { kind: "none" },
      collapsed: false,
      ratesNotice: null,
    });
  });

  it("exactly £0 left over is left over, not short", () => {
    expect(selectHomeStrip({ ...FACTS, budget: { ...KNOWN, surplus: 0 } }).first).toEqual({
      kind: "leftOver",
      figure: 0,
      leavesOut: null,
    });
  });

  it("a penny below zero is short", () => {
    expect(selectHomeStrip({ ...FACTS, budget: { ...KNOWN, surplus: -0.01 } }).first).toEqual({
      kind: "short",
      figure: -0.01,
      leavesOut: null,
    });
  });

  it("income and no spending is income only, with the income as the figure", () => {
    expect(
      selectHomeStrip({ ...FACTS, budget: { ...KNOWN, hasSpending: false, leavesOut: "x" } }).first,
    ).toEqual({ kind: "incomeOnly", figure: 2085, leavesOut: "x" });
  });

  it("no spending and an unreadable income falls back to the surplus", () => {
    expect(
      selectHomeStrip({ ...FACTS, budget: { ...KNOWN, hasSpending: false, income: null } }).first,
    ).toEqual({ kind: "leftOver", figure: 645, leavesOut: null });
  });

  it("no income row: no left over (it would only be minus the spending)", () => {
    const strip = selectHomeStrip({
      ...FACTS,
      budget: { ...KNOWN, hasIncome: false, surplus: -1200 },
    });
    expect(strip.first).toEqual({ kind: "unset" });
    expect(strip.collapsed).toBe(true);
  });

  it("no income row and no spending is not income only", () => {
    expect(
      selectHomeStrip({
        ...FACTS,
        budget: { ...KNOWN, hasIncome: false, hasSpending: false },
      }).first,
    ).toEqual({ kind: "unset" });
  });

  it("an unreadable surplus is not set", () => {
    expect(selectHomeStrip({ ...FACTS, budget: { ...KNOWN, surplus: null } }).first).toEqual({
      kind: "unset",
    });
  });

  it("an unknown budget is not set, and the strip is one prompt", () => {
    expect(
      selectHomeStrip({ budget: { status: "unknown" }, consumerDebt: 1800, pensionPot: 24000 }),
    ).toEqual({
      first: { kind: "unset" },
      second: { kind: "owed", figure: 1800 },
      collapsed: true,
      ratesNotice: null,
    });
  });

  it("a refused budget keeps its notice and is not collapsed", () => {
    expect(
      selectHomeStrip({
        budget: { status: "refused", notice: "No Scottish rates." },
        consumerDebt: null,
        pensionPot: null,
        takeHomeRates: PROVISIONAL,
      }),
    ).toEqual({
      first: { kind: "refused", notice: "No Scottish rates." },
      second: { kind: "none" },
      collapsed: false,
      ratesNotice: null,
    });
  });
});

describe("selectHomeStrip: the second card", () => {
  it("what you owe when there is consumer debt, before the pension", () => {
    expect(selectHomeStrip({ ...FACTS, consumerDebt: 1800, pensionPot: 24000 }).second).toEqual({
      kind: "owed",
      figure: 1800,
    });
  });

  it("£0 owed gives way to the pension pots", () => {
    expect(selectHomeStrip({ ...FACTS, consumerDebt: 0, pensionPot: 24000 }).second).toEqual({
      kind: "pension",
      figure: 24000,
    });
  });

  it("a penny owed is what you owe", () => {
    expect(selectHomeStrip({ ...FACTS, consumerDebt: 0.01, pensionPot: 24000 }).second).toEqual({
      kind: "owed",
      figure: 0.01,
    });
  });

  it("a pension account at £0 is still a pension card", () => {
    expect(selectHomeStrip({ ...FACTS, pensionPot: 0 }).second).toEqual({
      kind: "pension",
      figure: 0,
    });
  });

  it("no debt and no pension account: no second card", () => {
    expect(selectHomeStrip(FACTS).second).toEqual({ kind: "none" });
  });

  it("two cards with the first set are not collapsed", () => {
    expect(selectHomeStrip({ ...FACTS, pensionPot: 24000 }).collapsed).toBe(false);
  });
});

describe("selectHomeStrip: the rates notice", () => {
  it("provisional rates under a worked-out take-home figure", () => {
    expect(selectHomeStrip({ ...FACTS, takeHomeRates: PROVISIONAL }).ratesNotice).toEqual(
      PROVISIONAL,
    );
  });

  it("fallback rates under a worked-out take-home figure", () => {
    expect(selectHomeStrip({ ...FACTS, takeHomeRates: FALLBACK }).ratesNotice).toEqual(FALLBACK);
  });

  it("rates of another year than the calendar's, with no flag", () => {
    const other = { calendarYear: "2027/28", ratesYear: "2026/27", isFallback: false } as const;
    expect(selectHomeStrip({ ...FACTS, takeHomeRates: other }).ratesNotice).toEqual(other);
  });

  it("no notice for the current year's confirmed rates", () => {
    expect(selectHomeStrip({ ...FACTS, takeHomeRates: CURRENT_YEAR }).ratesNotice).toBeNull();
  });

  it("no notice when no worked-out take-home is counted", () => {
    expect(selectHomeStrip({ ...FACTS, takeHomeRates: null }).ratesNotice).toBeNull();
    expect(selectHomeStrip(FACTS).ratesNotice).toBeNull();
  });

  it("an income-only figure carries the notice", () => {
    expect(
      selectHomeStrip({
        ...FACTS,
        budget: { ...KNOWN, hasSpending: false },
        takeHomeRates: FALLBACK,
      }).ratesNotice,
    ).toEqual(FALLBACK);
  });

  it("no notice when the strip is the prompt", () => {
    expect(
      selectHomeStrip({ ...FACTS, budget: { status: "unknown" }, takeHomeRates: FALLBACK })
        .ratesNotice,
    ).toBeNull();
  });
});

describe("the budget rules", () => {
  it("spending counts from outgoings, from savings, or from a stored amount", () => {
    expect(budgetHasSpending({ outgoings: 0.01, savings: 0 }, [])).toBe(true);
    expect(budgetHasSpending({ outgoings: 0, savings: 0.01 }, [])).toBe(true);
    expect(budgetHasSpending({ outgoings: 0, savings: 0 }, [{ amount: "60" }])).toBe(true);
    expect(budgetHasSpending(null, [{ amount: 60, isIncome: false }])).toBe(true);
  });

  it("income rows, £0 rows, empty rows and no rows are not spending", () => {
    expect(
      budgetHasSpending({ outgoings: 0, savings: 0 }, [
        { amount: 2085, isIncome: true },
        // Any truthy flag marks income, as web's loader read it.
        { amount: 500, isIncome: 1 },
        { amount: 0 },
        { amount: "not a number" },
        null,
        undefined,
      ]),
    ).toBe(false);
    expect(budgetHasSpending(null, null)).toBe(false);
    expect(budgetHasSpending(null, undefined)).toBe(false);
  });

  it("left over only with an income row", () => {
    expect(budgetSurplusOrNull({ hasIncome: true, surplus: -15 })).toBe(-15);
    expect(budgetSurplusOrNull({ hasIncome: false, surplus: -15 })).toBeNull();
    expect(budgetSurplusOrNull(null)).toBeNull();
  });

  const totals: BudgetTotals = {
    income: 2333,
    essentials: 1200,
    savings: 150,
    discretionary: 90,
    outgoings: 1290,
    surplus: 893,
    debtPayments: 0,
    hasIncome: true,
    hasEssentials: true,
  };

  it("what the budget leaves out, joined into one line", () => {
    expect(budgetLeavesOut(figureKnown(totals, "assumption", ["One.", "Two."]))).toBe("One. Two.");
    expect(budgetLeavesOut(figureKnown(totals))).toBeNull();
    expect(budgetLeavesOut(figureUnknown(["budget"], "not-set"))).toBeNull();
  });

  const refused = figureRefused<TakeHome>({ notice: "No Scottish rates." });
  const linkedNotSet = [{ linked: "take_home" as const, notSet: true }];

  it("a refusal notice only when the linked take-home line is refused", () => {
    const unknown = figureUnknown<BudgetTotals>(["annualSalary"], "not-set");
    expect(
      budgetRefusalNotice({ budget: unknown, takeHome: refused, budgetRows: linkedNotSet }),
    ).toBe("No Scottish rates.");
    // A known budget, a take-home that is merely not set, or no linked line: no notice.
    expect(
      budgetRefusalNotice({
        budget: figureKnown(totals),
        takeHome: refused,
        budgetRows: linkedNotSet,
      }),
    ).toBeNull();
    expect(
      budgetRefusalNotice({
        budget: unknown,
        takeHome: figureUnknown(["annualSalary"], "not-set"),
        budgetRows: linkedNotSet,
      }),
    ).toBeNull();
    expect(
      budgetRefusalNotice({
        budget: unknown,
        takeHome: refused,
        budgetRows: [
          { linked: "take_home", notSet: false },
          { linked: "housing", notSet: true },
        ],
      }),
    ).toBeNull();
    expect(
      budgetRefusalNotice({
        budget: unknown,
        takeHome: figureUnknown<TakeHome>([], "rates-not-published"),
        budgetRows: linkedNotSet,
      }),
    ).toBeNull();
  });

  const workedOut = figureKnown<TakeHome>({
    basis: "worked-out",
    monthly: 2333,
    annual: 28000,
    incomeTax: 4326,
    nationalInsurance: 1874.4,
    studentLoan: 0,
    pension: 1800,
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
  });
  const typed = figureKnown<TakeHome>(
    {
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
    "user",
  );
  const line = (over: Record<string, unknown>) => ({
    amount: 2333,
    frequency: "monthly",
    linked: "take_home" as const,
    ...over,
  });

  it("the budget counts a worked-out take-home line only when it is set and above £0", () => {
    expect(budgetCountsWorkedOutTakeHome(workedOut, [line({})])).toBe(true);
    expect(budgetCountsWorkedOutTakeHome(typed, [line({})])).toBe(false);
    expect(budgetCountsWorkedOutTakeHome(refused, [line({})])).toBe(false);
    expect(budgetCountsWorkedOutTakeHome(workedOut, [line({ notSet: true })])).toBe(false);
    expect(budgetCountsWorkedOutTakeHome(workedOut, [line({ amount: 0 })])).toBe(false);
    expect(budgetCountsWorkedOutTakeHome(workedOut, [line({ linked: "housing" })])).toBe(false);
    expect(budgetCountsWorkedOutTakeHome(workedOut, [])).toBe(false);
  });

  it("homeStripBudget carries the totals, the spending rule and what is left out", () => {
    expect(
      homeStripBudget({
        budget: figureKnown(totals, "assumption", ["No Plan 1."]),
        takeHome: workedOut,
        budgetRows: [line({})],
        savedRows: [],
      }),
    ).toEqual({
      status: "known",
      income: 2333,
      surplus: 893,
      hasIncome: true,
      hasSpending: true,
      leavesOut: "No Plan 1.",
    });
  });

  it("homeStripBudget: refused with the notice, or unknown", () => {
    const unknown = figureUnknown<BudgetTotals>(["annualSalary"], "not-set");
    expect(
      homeStripBudget({
        budget: unknown,
        takeHome: refused,
        budgetRows: linkedNotSet,
        savedRows: [],
      }),
    ).toEqual({ status: "refused", notice: "No Scottish rates." });
    expect(
      homeStripBudget({ budget: unknown, takeHome: workedOut, budgetRows: [], savedRows: [] }),
    ).toEqual({ status: "unknown" });
  });
});

describe("selectHomeStripFromRows", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const renterAccounts = [
    { id: "acc-current", name: "Current account", type: "Current", balance: 900 },
    { id: "acc-pension", name: "Workplace pension", type: "Pension", balance: 14000 },
    { id: "acc-card", name: "Credit card", type: "Credit Card", balance: 1800 },
    { id: "acc-sl", name: "Student loan", type: "Student Loan", balance: 38500 },
  ];
  const row = (name: string, category: string, amount: number, flags = {}) => ({
    id: `row-${name}`,
    name,
    category,
    amount,
    ...flags,
  });
  // The renter persona's budget (apps/e2e/support/personas.ts), rows not linked.
  const renterBudget = [
    row("Salary after tax", "income", 2085, { isIncome: true }),
    row("Rent", "housing", 950, { isEssential: true }),
    row("Council tax", "bills", 115, { isEssential: true }),
    row("Energy", "bills", 80, { isEssential: true }),
    row("Phone and broadband", "bills", 40, { isEssential: true }),
    row("Groceries", "expenses", 250, { isEssential: true }),
    row("Travel", "expenses", 120, { isEssential: true }),
    row("Eating out", "expenses", 90),
    row("Subscriptions", "expenses", 25),
    row("Everything else", "expenses", 80),
    row("Credit card payment", "bills", 60, { isEssential: true }),
    row("Easy access savings", "savings", 150),
  ];

  it("the renter: left over 125 and what you owe 1,800", () => {
    // Income 2,085; essentials 950 + 115 + 80 + 40 + 250 + 120 + 60 = 1,615; other spending
    // 90 + 25 + 80 = 195; savings 150. Left over 2,085 - 1,615 - 195 - 150 = 125. Owed: the card's
    // 1,800 (the student loan is not consumer debt, and the pension gives way to the debt).
    expect(
      selectHomeStripFromRows({
        accounts: renterAccounts,
        budgetEntries: renterBudget,
        profile: { annualSalary: 28000 },
        today: new Date("2026-11-27T12:00:00Z"),
      }),
    ).toEqual({
      first: { kind: "leftOver", figure: 125, leavesOut: null },
      second: { kind: "owed", figure: 1800 },
      collapsed: false,
      ratesNotice: null,
    });
  });

  const EMPLOYEE = {
    annualSalary: 36000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    pensionPercent: 5,
    isSalarySacrifice: false,
  } as const;
  const TAKE_HOME_ROW = row("Salary after tax", "income", 1, {
    isIncome: true,
    linkKind: "take_home",
  });
  const SPENDING = [
    row("Rent", "housing", 950, { isEssential: true }),
    row("Groceries", "expenses", 250, { isEssential: true }),
    row("Eating out", "expenses", 90),
    row("Easy access", "savings", 150),
  ];

  it("a linked take-home in a provisional year carries the rates notice", () => {
    // Take-home 2,333 (as 2026/27: 36,000 less 1,800, 4,326 and 1,874.40, over 12, rounded).
    // Left over 2,333 - 950 - 250 - 90 - 150 = 893.
    expect(
      selectHomeStripFromRows({
        accounts: [renterAccounts[1] as (typeof renterAccounts)[number]],
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        profile: EMPLOYEE,
        today: new Date("2027-06-01T12:00:00Z"),
      }),
    ).toEqual({
      first: { kind: "leftOver", figure: 893, leavesOut: null },
      second: { kind: "pension", figure: 14000 },
      collapsed: false,
      ratesNotice: PROVISIONAL,
    });
  });

  it("the take-home's year comes from today, not the clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));
    expect(
      selectHomeStripFromRows({
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        profile: EMPLOYEE,
        today: new Date("2028-06-01T12:00:00Z"),
      }).ratesNotice,
    ).toEqual(FALLBACK);
  });

  it("Scotland in 2027/28: refused, with the notice", () => {
    expect(
      selectHomeStripFromRows({
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        profile: { ...EMPLOYEE, taxRegion: "SCOTLAND" },
        today: new Date("2027-06-01T12:00:00Z"),
      }),
    ).toEqual({
      first: {
        kind: "refused",
        notice:
          "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
      },
      second: { kind: "none" },
      collapsed: false,
      ratesNotice: null,
    });
  });

  it("before the earliest supported year the take-home and so the budget are unknown", () => {
    expect(
      selectHomeStripFromRows({
        budgetEntries: [TAKE_HOME_ROW, ...SPENDING],
        profile: EMPLOYEE,
        today: new Date("2019-06-01T12:00:00Z"),
      }),
    ).toEqual({
      first: { kind: "unset" },
      second: { kind: "none" },
      collapsed: true,
      ratesNotice: null,
    });
  });

  it("no rows at all: the prompt", () => {
    expect(selectHomeStripFromRows({ today: new Date("2026-11-27T12:00:00Z") })).toEqual({
      first: { kind: "unset" },
      second: { kind: "none" },
      collapsed: true,
      ratesNotice: null,
    });
  });

  it("empty rows are skipped, and income only with a typed take-home has no rates notice", () => {
    expect(
      selectHomeStripFromRows({
        budgetEntries: [null, row("Salary", "income", 2085, { isIncome: true }), undefined],
        accounts: [{ id: "acc-od", name: "Overdraft", type: "Overdraft", balance: 400 }],
        profile: { monthlyTakeHome: 2085 },
        today: new Date("2027-06-01T12:00:00Z"),
      }),
    ).toEqual({
      first: { kind: "incomeOnly", figure: 2085, leavesOut: null },
      second: { kind: "owed", figure: 400 },
      collapsed: false,
      ratesNotice: null,
    });
  });
});

describe("the rows and the picture agree", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const EMPLOYEE = {
    annualSalary: 36000,
    employmentType: "employed",
    taxRegion: "ENGLAND",
    studentLoanPlans: ["PLAN_1"],
    pensionPercent: 5,
    isSalarySacrifice: false,
    housingStatus: "renting",
    monthlyHousingCost: 950,
  };
  const accounts = [
    { id: "acc-card", name: "Credit card", type: "Credit Card", balance: 1800 },
    { id: "acc-pension", name: "Workplace pension", type: "Pension", balance: 24000 },
  ];
  const budgetEntries = [
    {
      id: "r1",
      name: "Salary",
      category: "income",
      amount: 1,
      isIncome: true,
      linkKind: "take_home",
    },
    {
      id: "r2",
      name: "Rent",
      category: "housing",
      amount: 1,
      isEssential: true,
      linkKind: "housing",
    },
    { id: "r3", name: "Groceries", category: "expenses", amount: 250, isEssential: true },
  ];

  it.each(["2026-11-27T12:00:00Z", "2027-06-01T12:00:00Z", "2028-06-01T12:00:00Z"])(
    "on %s the strip from rows is the strip from the picture's figures",
    (today) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(today));
      const picture = buildFinancialPicture(
        financialPictureInputFromRows({ profile: EMPLOYEE as never, accounts, budgetEntries }),
      );
      const fromPicture = selectHomeStrip({
        budget: homeStripBudget({
          budget: picture.budget,
          takeHome: picture.takeHome,
          budgetRows: picture.budgetRows,
          savedRows: budgetEntries,
        }),
        consumerDebt: picture.debtSummary?.totalDebt ?? null,
        pensionPot: picture.netWorth.pensions,
        takeHomeRates: budgetCountsWorkedOutTakeHome(picture.takeHome, picture.budgetRows)
          ? getUkTaxYearContext()
          : null,
      });
      const fromRows = selectHomeStripFromRows({
        accounts,
        budgetEntries,
        profile: EMPLOYEE as never,
        today: new Date(today),
      });
      expect(fromRows).toEqual(fromPicture);
      // 2026/27 charges Plan 1: (36,000 - 26,900) x 9% = 819 a year, so take-home
      // (27,999.60 - 819) / 12 = 2,265.05, rounded 2,265; less rent 950 and groceries 250 = 1,065.
      // In 2027/28 (and its fallback) Plan 1 is left out: 2,333 - 950 - 250 = 1,133.
      expect(fromRows.first).toEqual({
        kind: "leftOver",
        figure: today.startsWith("2026") ? 1065 : 1133,
        leavesOut: today.startsWith("2026")
          ? null
          : "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.",
      });
    },
  );
});
