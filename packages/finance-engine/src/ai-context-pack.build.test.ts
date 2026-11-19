import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_USER_ID,
  anonymiseContextPackInput,
  type BuildContextPackInput,
  buildFlumpAiContextPack,
  formatAiContextPackMarkdown,
  isUkTaxCalculated,
} from "./ai-context-pack.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { DEFAULT_FINANCIAL_BASELINE, userProfileToSavedBaseline } from "./profile.js";

// 19 November 2026, local noon.
const asOf = new Date(2026, 10, 19, 12);

const build = (input: Partial<BuildContextPackInput>, when: Date = asOf) =>
  buildFlumpAiContextPack(
    {
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "u" },
      ...input,
    },
    { anonymizeInstitutions: false, asOf: when },
  );

describe("the context pack anonymises by default", () => {
  it("hides the user id and account names when no option is passed", () => {
    const pack = buildFlumpAiContextPack({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "usr_real_123" },
      accounts: [{ id: "a", name: "Monzo joint", type: "Current", balance: 10 }],
    });
    expect(pack.metadata.isAnonymized).toBe(true);
    expect(pack.baseline.userId).toBe(ANONYMOUS_USER_ID);
    expect(pack.portfolio.accounts.map((a) => a.name)).toEqual(["Current Account #1"]);
  });

  it("states the currency and the schema version", () => {
    const pack = build({});
    expect(pack.metadata.currency).toBe("GBP");
    expect(pack.metadata.schemaVersion).toBe("1.0.0");
  });
});

describe("isUkTaxCalculated", () => {
  it("is false for a salary that is not set and for a self-employed person", () => {
    expect(isUkTaxCalculated({ notSet: ["annualSalary"] })).toBe(false);
    expect(isUkTaxCalculated({ notApplicable: "selfEmployed" })).toBe(false);
  });
});

describe("anonymiseContextPackInput", () => {
  it("works on an input with no accounts, and adds none", () => {
    const out = anonymiseContextPackInput({
      netWorthBasis: DEFAULT_NET_WORTH_BASIS,
      baseline: { ...DEFAULT_FINANCIAL_BASELINE, userId: "usr_real_123" },
    });
    expect(out.baseline.userId).toBe(ANONYMOUS_USER_ID);
    expect(out).not.toHaveProperty("accounts");
  });
});

describe("the pack keeps only a saved salary", () => {
  it("leaves out a salary of 0, the baseline's 'no salary known'", () => {
    const pack = build({ baseline: { ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 0 } });
    expect(pack.baseline).not.toHaveProperty("annualGrossSalary");
    expect(pack.taxSummary.ukTaxCalculation).toEqual({ notSet: ["annualSalary"] });
  });

  it("leaves out a salary the baseline marks as not saved, whatever its figure", () => {
    const pack = build({
      baseline: {
        ...DEFAULT_FINANCIAL_BASELINE,
        annualGrossSalary: 45000,
        notSet: ["annualGrossSalary"],
      },
    });
    expect(pack.baseline).not.toHaveProperty("annualGrossSalary");
    expect(pack.taxSummary.ukTaxCalculation).toEqual({ notSet: ["annualSalary"] });
  });
});

describe("the pack with nothing saved", () => {
  it("lists no accounts, no budget lines and no budget figures", () => {
    const pack = build({});
    expect(pack.portfolio.accounts).toEqual([]);
    expect(pack.budgetSummary.entries).toEqual([]);
    expect(pack.budgetSummary.entriesNotSet).toEqual([]);
    expect(pack.budgetSummary.discretionarySpendMonthly).toBeNull();
    expect(pack.budgetSummary.plannedSavingsMonthly).toBeNull();
  });

  it("has no 0% deal alerts and no estimated minimums without debts", () => {
    const pack = build({});
    expect(pack.debtSummary.promoCliffAlerts).toEqual([]);
    expect(pack.debtSummary.monthlyMinimumsEstimated).toBe(false);
  });

  it("has no Self Assessment estimate without tax records, or with an empty list", () => {
    const none = build({});
    const empty = build({ taxRecords: [] });
    expect(none.taxSummary.selfAssessmentLedgerSummary).toBeUndefined();
    expect(empty.taxSummary.selfAssessmentLedgerSummary).toBeUndefined();
    expect(formatAiContextPackMarkdown(empty)).not.toContain("Self Assessment estimate");
  });
});

describe("the pack measures dates from asOf", () => {
  it("uses the tax year and the debt-free date that apply on asOf", () => {
    // 15 June 2024 is in the tax year 6 April 2024 to 5 April 2025: 2024/25.
    // £1,200 at a saved 0% APR, £100 a month: 1,200 / 100 = 12 payments, the first in July
    // 2024 and the twelfth in June 2025.
    const pack = build(
      {
        accounts: [
          {
            id: "l1",
            name: "Loan",
            type: "Loan",
            balance: 1200,
            interestRate: 0,
            monthlyContribution: 100,
          },
        ],
      },
      new Date(2024, 5, 15, 12),
    );
    expect(pack.taxSummary.currentTaxYear).toBe("2024/25");
    expect(pack.debtSummary.debtFreeDate).toBe("June 2025");
  });

  it("carries 12 months of history, ending this month", () => {
    // A balance recorded in September 2025 starts the series, which runs to November 2026:
    // 15 months. The last 12 are December 2025 to November 2026.
    const pack = build({
      accounts: [{ id: "a1", name: "Current", type: "Current", balance: 1500 }],
      accountDetails: [{ accountId: "a1", year: 2025, month: 9, value: 1000 }],
    });
    const labels = pack.portfolio.monthlyHistory.map((p) => p.label);
    expect(labels).toHaveLength(12);
    expect(labels[0]).toBe("Dec 2025");
    expect(labels[11]).toBe("Nov 2026");
  });
});

describe("why the pack gives no debt-free date", () => {
  it("says the minimums do not clear the debts when every APR is saved", () => {
    // £10,000 at 20% APR is £10,000 x 20% / 12 = £166.67 interest a month, more than the £10
    // minimum, so the balance grows and never clears.
    const pack = build({
      accounts: [
        {
          id: "l1",
          name: "Loan",
          type: "Loan",
          balance: 10000,
          interestRate: 20,
          monthlyContribution: 10,
        },
      ],
    });
    expect(pack.debtSummary.debtFreeDate).toBeNull();
    expect(pack.debtSummary.debtFreeDateUnknownReason).toBe("notClearedOnMinimums");
  });

  it("says an APR is not saved when only one of several debts lacks one", () => {
    const pack = build({
      accounts: [
        { id: "c1", name: "Card", type: "Credit Card", balance: 1200, monthlyContribution: 100 },
        {
          id: "l1",
          name: "Loan",
          type: "Loan",
          balance: 1200,
          interestRate: 0,
          monthlyContribution: 100,
        },
      ],
    });
    expect(pack.debtSummary.debtFreeDate).toBeNull();
    expect(pack.debtSummary.debtFreeDateUnknownReason).toBe("aprUnknown");
  });
});

describe("debts in the pack", () => {
  it("flags estimated minimums when a debt has no saved minimum payment", () => {
    const pack = build({
      accounts: [{ id: "c1", name: "Card", type: "Credit Card", balance: 1200, interestRate: 20 }],
    });
    expect(pack.debtSummary.monthlyMinimumsEstimated).toBe(true);
  });

  it("measures a 0% deal from asOf", () => {
    // asOf 15 January 2025; the 0% deal ends 15 July 2025. 15 January to 15 July is
    // 16 + 28 + 31 + 30 + 31 + 30 + 15 = 181 days, and 181 / 30.4375 = 5.95, so 6 months.
    // £1,200 over 6 months is £200 a month.
    const pack = build(
      {
        accounts: [
          {
            id: "c1",
            name: "Card",
            type: "Credit Card",
            balance: 1200,
            interestRate: 0,
            monthlyContribution: 100,
            promoZeroPercentUntil: "2025-07-15",
          },
        ],
      },
      new Date(2025, 0, 15, 12),
    );
    expect(pack.debtSummary.promoCliffAlerts).toHaveLength(1);
    expect(pack.debtSummary.promoCliffAlerts[0]?.requiredMonthlyToClearBeforeCliff).toBe(200);
  });
});

describe("the student loan check needs a saved salary, a plan and a balance", () => {
  const studentLoan = [{ id: "sl1", name: "Student loan", type: "Student Loan", balance: 20000 }];

  it("is left out without a saved salary, even with a plan and a balance", () => {
    const pack = build({
      baseline: userProfileToSavedBaseline({ studentLoanPlans: ["PLAN_2"] }),
      accounts: studentLoan,
    });
    expect(pack.debtSummary.studentLoanEvaluation).toBeUndefined();
  });

  it("is left out when the plan is NONE, even with a salary and a balance", () => {
    const pack = build({
      baseline: {
        ...DEFAULT_FINANCIAL_BASELINE,
        annualGrossSalary: 45000,
        studentLoanPlan: "NONE",
      },
      accounts: studentLoan,
    });
    expect(pack.debtSummary.studentLoanEvaluation).toBeUndefined();
  });
});

describe("the tax facts come from the saved profile when the caller has it", () => {
  it("works no salary tax when the profile says self-employed, whatever the baseline says", () => {
    const pack = build({
      baseline: {
        ...DEFAULT_FINANCIAL_BASELINE,
        employmentStatus: "PAYE",
        annualGrossSalary: 45000,
      },
      profileFacts: {
        annualSalary: 45000,
        employmentType: "self-employed",
        taxRegion: "ENGLAND",
        studentLoanPlans: [],
        pensionPercent: 5,
        isSalarySacrifice: false,
      },
    });
    expect(pack.taxSummary.ukTaxCalculation).toEqual({ notApplicable: "selfEmployed" });
  });

  it("works out the same salary tax as net pay when the pension method is not set", () => {
    // The pack states that it assumes net pay, so the figures must be the net pay figures.
    const baseline = { ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 60000 };
    const notSet = build({
      baseline: { ...baseline, isSalarySacrifice: false, notSet: ["isSalarySacrifice"] },
    }).taxSummary.ukTaxCalculation;
    const netPay = build({ baseline: { ...baseline, isSalarySacrifice: false } }).taxSummary
      .ukTaxCalculation;
    expect(isUkTaxCalculated(notSet) && isUkTaxCalculated(netPay)).toBe(true);
    const { assumptions: _a, ...notSetFigures } = notSet as { assumptions?: string[] };
    const { assumptions: _b, ...netPayFigures } = netPay as { assumptions?: string[] };
    expect(notSetFigures).toEqual(netPayFigures);
  });
});

describe("budget figures in the pack", () => {
  const row = (id: string, category: string, amount: number, isEssential: boolean) => ({
    id,
    category,
    name: id,
    amount,
    frequency: "monthly",
    isIncome: category === "income",
    isEssential,
  });

  it("states discretionary spending and planned saving from the budget", () => {
    // Non-essential lifestyle £200 is discretionary; the savings row £300 is planned saving.
    const pack = build({
      budgetEntries: [
        row("pay", "income", 3000, false),
        row("rent", "housing", 1000, true),
        row("fun", "lifestyle", 200, false),
        row("isa", "savings", 300, false),
      ],
    });
    expect(pack.budgetSummary.discretionarySpendMonthly).toBe(200);
    expect(pack.budgetSummary.plannedSavingsMonthly).toBe(300);
  });

  it("says £0 is left over when spending equals income", () => {
    // £1,500 income - £1,000 rent - £500 lifestyle = £0 left over.
    const pack = build({
      budgetEntries: [
        row("pay", "income", 1500, false),
        row("rent", "housing", 1000, true),
        row("fun", "lifestyle", 500, false),
      ],
    });
    expect(pack.observations).toContain(
      "£0 a month is left over after the spending and saving in the budget.",
    );
  });
});
