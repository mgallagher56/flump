import { describe, expect, it } from "vitest";
import {
  type BuildContextPackInput,
  buildFlumpAiContextPack,
  formatAiContextPackMarkdown,
  isPackFigureNotAvailable,
  isUkTaxCalculated,
} from "./ai-context-pack.js";
import {
  evaluateUkStudentLoanOrRefusal,
  studentLoanEstimateNotPublishedNotice,
} from "./debt-payoff.js";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import { buildFinancialPicture } from "./picture/build.js";
import { figureRefused, figureUnknown } from "./picture/figure.js";
import { profileFactsFromProfile } from "./picture/input.js";
import { selectBudgetTotals } from "./picture/selectors/budget-totals.js";
import { selectHousingCost } from "./picture/selectors/housing-cost.js";
import { selectSafeToSpend } from "./picture/selectors/safe-to-spend.js";
import { selectTakeHome } from "./picture/selectors/take-home.js";
import { PortfolioSnapshot } from "./portfolio.js";
import { DEFAULT_FINANCIAL_BASELINE } from "./profile.js";
import { scenarioWithPublishedRates } from "./uk-take-home.js";
import {
  scottishRatesNotPublishedNotice,
  studentLoanThresholdNotPublishedNotice,
} from "./uk-tax-year.js";

// Callers of the 2027/28 refusals (owner decision: refused, never carried forward). Every date
// and year here is fixed: 1 May 2027 is in tax year 2027/28 (6 Apr 2027 to 5 Apr 2028).
const IN_2027_28 = new Date(2027, 4, 1, 12);
const SCOTTISH = scottishRatesNotPublishedNotice("2027/28");
const LOAN_LEFT_OUT = studentLoanThresholdNotPublishedNotice("2027/28");

describe("evaluateUkStudentLoanOrRefusal", () => {
  it.each(["plan1", "plan4", "PLAN_1", "PLAN_4"])(
    "refuses %s in 2027/28 with the estimate line",
    (plan) => {
      const outcome = evaluateUkStudentLoanOrRefusal(plan, 40_000, 20_000, "2027/28");
      expect(outcome).toEqual({
        status: "refused",
        refusal: {
          kind: "student-loan-threshold-not-published",
          taxYear: "2027/28",
          notice: studentLoanEstimateNotPublishedNotice("2027/28"),
        },
      });
    },
  );

  it("still estimates Plan 1 in 2026/27, where its threshold is published", () => {
    // 2026/27 Plan 1: 9% above £26,900. (£40,000 - £26,900) x 9% = £1,179 a year.
    const outcome = evaluateUkStudentLoanOrRefusal("plan1", 40_000, 20_000, "2026/27");
    expect(outcome.status).toBe("known");
    if (outcome.status === "known") expect(outcome.evaluation.annualRepayment).toBe(1179);
  });
});

describe("scenarioWithPublishedRates", () => {
  it("refuses a Scottish scenario in 2027/28", () => {
    const checked = scenarioWithPublishedRates({
      taxYear: "2027/28",
      region: "SCOTLAND",
      salary: 40_000,
    });
    expect(checked).toEqual({
      status: "refused",
      refusal: { kind: "scottish-rates-not-published", taxYear: "2027/28", notice: SCOTTISH },
    });
  });

  it("leaves out Plan 4 and keeps Plan 2, saying what it leaves out", () => {
    const checked = scenarioWithPublishedRates({
      taxYear: "2027/28",
      salary: 40_000,
      studentLoans: ["plan2", "plan4"],
    });
    expect(checked).toEqual({
      status: "ok",
      scenario: { taxYear: "2027/28", salary: 40_000, studentLoans: ["plan2"] },
      notes: [LOAN_LEFT_OUT],
    });
  });

  it("leaves a 2026/27 Scottish scenario unchanged", () => {
    const s = { taxYear: "2026/27", region: "SCOTLAND" as const, salary: 40_000 };
    expect(scenarioWithPublishedRates(s)).toEqual({ status: "ok", scenario: s, notes: [] });
  });
});

describe("selectors pass a refused take-home through with its notice", () => {
  const refused = figureRefused({ notice: SCOTTISH });
  const snapshot = new PortfolioSnapshot([], []);

  it("safe to spend with no budget income", () => {
    expect(selectSafeToSpend(refused, [], snapshot)).toEqual(
      figureUnknown([], "rates-not-published", SCOTTISH),
    );
  });

  it("housing cost", () => {
    const fig = selectHousingCost(
      {
        annualSalary: 40_000,
        employmentType: "employed",
        taxRegion: "SCOTLAND",
        studentLoanPlans: [],
        pensionPercent: 0,
        isSalarySacrifice: false,
        housingStatus: "renting",
        monthlyHousingCost: 900,
      } as never,
      refused,
      snapshot,
      [],
      [],
    );
    expect(fig.status).toBe("unknown");
    if (fig.status === "unknown") {
      expect(fig.reason).toBe("rates-not-published");
      expect(fig.notice).toBe(SCOTTISH);
    }
  });
});

describe("context pack in 2027/28", () => {
  const build = (
    baseline: Partial<BuildContextPackInput["baseline"]>,
    extra: Partial<BuildContextPackInput> = {},
  ) =>
    buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: { ...DEFAULT_FINANCIAL_BASELINE, annualGrossSalary: 40_000, ...baseline },
        ...extra,
      },
      { anonymizeInstitutions: false, asOf: IN_2027_28 },
    );

  it("gives a Scottish taxpayer no salary tax figure, with the reason, and the rest still builds", () => {
    const pack = build(
      { ukRegion: "SCOTLAND" },
      {
        accounts: [{ id: "a", name: "Current", type: "Current", balance: 1200 }],
      },
    );
    expect(pack.taxSummary.currentTaxYear).toBe("2027/28");
    expect(pack.taxSummary.ukTaxCalculation).toEqual({
      notAvailable: "rates-not-published",
      notice: SCOTTISH,
    });
    expect(isUkTaxCalculated(pack.taxSummary.ukTaxCalculation)).toBe(false);
    expect(pack.portfolio.netWorth).toBe(1200);
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toContain(`- **Income tax and take-home pay:** ${SCOTTISH}`);
  });

  it("refuses a Scottish Self Assessment estimate rather than throwing", () => {
    const pack = build(
      { ukRegion: "SCOTLAND" },
      {
        taxRecords: [
          {
            id: "t1",
            type: "income",
            source: "rental",
            category: "rental_income",
            name: "Flat",
            amount: 9000,
            frequency: "one-off",
            date: "2027-05-01",
            endDate: null,
          },
        ],
      },
    );
    expect(pack.taxSummary.selfAssessmentLedgerSummary).toEqual({
      notAvailable: "rates-not-published",
      notice: SCOTTISH,
    });
    expect(formatAiContextPackMarkdown(pack)).toContain(
      `- **Self Assessment estimate:** ${SCOTTISH}`,
    );
  });

  it("leaves out Plan 1 from the salary tax and says so; the student loan estimate is refused", () => {
    const pack = build(
      { studentLoanPlan: "PLAN_1" },
      { accounts: [{ id: "sl", name: "Student loan", type: "Student Loan", balance: 20_000 }] },
    );
    const tx = pack.taxSummary.ukTaxCalculation;
    expect(isUkTaxCalculated(tx)).toBe(true);
    if (isUkTaxCalculated(tx)) {
      // The plan is left out, so nothing is deducted for it: £0, by the refusal rule.
      expect(tx.studentLoanDeductionGbp).toBe(0);
      expect(tx.assumptions).toContain(LOAN_LEFT_OUT);
    }
    expect(pack.debtSummary.studentLoanEvaluation).toEqual({
      notAvailable: "rates-not-published",
      notice: studentLoanEstimateNotPublishedNotice("2027/28"),
    });
    expect(isPackFigureNotAvailable(pack.debtSummary.studentLoanEvaluation)).toBe(true);
    const md = formatAiContextPackMarkdown(pack);
    expect(md).toContain(studentLoanEstimateNotPublishedNotice("2027/28"));
    expect(md).toContain(`- **Assumption:** ${LOAN_LEFT_OUT}`);
  });
});

describe("a refused plan beside a published one (review finding 2)", () => {
  const FACTS = {
    annualSalary: 50_000,
    employmentType: "employed" as const,
    taxRegion: "ENGLAND",
    studentLoanPlans: ["PLAN_1", "PLAN_2"],
    pensionPercent: 0,
    isSalarySacrifice: false,
  };

  it("take-home still charges Plan 2 and says Plan 1 is left out", () => {
    const fig = selectTakeHome(FACTS, { taxYear: "2027/28" });
    expect(fig.status).toBe("known");
    if (fig.status === "known") {
      // 2027/28 Plan 2: 9% above £29,385. (£50,000 - £29,385) x 9% = £20,615 x 0.09 = £1,855.35.
      expect(fig.value.studentLoan).toBe(1855.35);
      expect(fig.assumptions).toContain(LOAN_LEFT_OUT);
    }
  });

  it("the context pack charges Plan 2 too and carries the notice", () => {
    const pack = buildFlumpAiContextPack(
      {
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        baseline: {
          ...DEFAULT_FINANCIAL_BASELINE,
          annualGrossSalary: 50_000,
          pensionContributionPct: 0,
          studentLoanPlan: "PLAN_1",
        },
        profileFacts: FACTS,
        accounts: [{ id: "sl", name: "Student loan", type: "Student Loan", balance: 20_000 }],
      },
      { anonymizeInstitutions: false, asOf: IN_2027_28 },
    );
    const tx = pack.taxSummary.ukTaxCalculation;
    expect(isUkTaxCalculated(tx)).toBe(true);
    if (isUkTaxCalculated(tx)) {
      // Same working as above: (£50,000 - £29,385) x 9% = £1,855.35.
      expect(tx.studentLoanDeductionGbp).toBe(1855.35);
      expect(tx.assumptions).toContain(LOAN_LEFT_OUT);
    }
    // The repayment estimate is for Plan 2 and says Plan 1 is left out (review re-check).
    const loan = pack.debtSummary.studentLoanEvaluation;
    expect(isPackFigureNotAvailable(loan)).toBe(false);
    if (loan && !isPackFigureNotAvailable(loan)) {
      expect(loan.plan).toBe("plan2");
      expect(loan.annualRepayment).toBe(1855.35);
      expect(loan.reasoning).toContain(LOAN_LEFT_OUT);
    }
  });
});

describe("budget totals say what the linked take-home leaves out (review finding 1)", () => {
  it("carries the refused-plan notice when the linked take-home line is counted", () => {
    const picture = buildFinancialPicture(
      {
        profile: {
          ...profileFactsFromProfile(null),
          annualSalary: 40_000,
          employmentType: "employed",
          taxRegion: "ENGLAND",
          studentLoanPlans: ["PLAN_1"],
          pensionPercent: 0,
          isSalarySacrifice: false,
        },
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        accounts: [],
        details: [],
        budget: [
          {
            id: "i",
            category: "income",
            name: "Pay",
            amount: 0,
            frequency: "monthly",
            isIncome: true,
            isEssential: false,
            linkKind: "take_home",
          },
          {
            id: "r",
            category: "housing",
            name: "Rent",
            amount: 900,
            frequency: "monthly",
            isIncome: false,
            isEssential: true,
          },
        ] as never,
      },
      { taxYear: "2027/28", asOf: IN_2027_28 },
    );
    expect(picture.budget.status).toBe("known");
    if (picture.budget.status === "known") {
      expect(picture.budget.assumptions).toEqual([LOAN_LEFT_OUT]);
    }
  });

  it("carries nothing when no linked take-home line is counted", () => {
    expect(
      selectBudgetTotals(
        [
          {
            id: "i",
            category: "income",
            name: "Pay",
            amount: 2000,
            frequency: "monthly",
            isIncome: true,
            isEssential: false,
          } as never,
        ],
        [LOAN_LEFT_OUT],
      ),
    ).not.toHaveProperty("assumptions");
  });
});
