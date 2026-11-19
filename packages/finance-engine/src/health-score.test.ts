import { describe, expect, it } from "vitest";
import { ADVICE_PATTERNS } from "./compliance/advice-lexicon.js";
import {
  calculateFinancialHealthScore,
  calculateSafeToSpend,
  evaluateFinancialStage,
  type HealthScoreInput,
  isHighInterestDebt,
} from "./health-score.js";
import { getLatestSupportedUkTaxYear, getUkTaxYearRules } from "./uk-tax-year.js";

describe("health-score module", () => {
  it("assigns stage-weighted score for STAGE_1_DEBT_RECOVERY", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_1_DEBT_RECOVERY",
      highInterestDebtGbp: 6500,
      totalUnsecuredDebtGbp: 6500,
      monthlyNetIncomeGbp: 2400,
      monthlyEssentialBillsGbp: 1800,
      monthlyMinimumDebtPaymentGbp: 200,
      emergencyFundGbp: 400,
    });

    expect(res.stage).toBe("STAGE_1_DEBT_RECOVERY");
    expect(res.components.length).toBe(3);
    expect(res.overallScore).toBeLessThan(75);
    expect(res.observations.length).toBeGreaterThan(0);
    expect(res.topRecommendations).toEqual([]);
  });

  it("states the tapering band as an observation, not an action", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_3_WEALTH_OPTIMIZE",
      adjustedNetIncomeGbp: 108000,
      annualIsaContributionGbp: 5000,
    });
    expect(res.observations).toContain(
      "Adjusted net income is £108,000, in the £100,000 to £125,140 band where the Personal Allowance reduces.",
    );
    expect(res.observations.join(" ")).toContain(
      "£15,000 of this tax year's ISA allowance is unused",
    );
  });

  it("never emits an observation or stage label matching ADVICE_PATTERNS", () => {
    const stages = [
      "STAGE_1_DEBT_RECOVERY",
      "STAGE_2_BUFFER_BUILD",
      "STAGE_3_WEALTH_OPTIMIZE",
    ] as const;
    const texts: string[] = [];
    for (const stage of stages) {
      for (const input of [
        {
          monthlyNetIncomeGbp: 1500,
          monthlyEssentialBillsGbp: 1800,
          highInterestDebtGbp: 8000,
          emergencyFundGbp: 100,
          cashSavingsYieldApr: 1,
          annualIsaContributionGbp: 0,
          adjustedNetIncomeGbp: 110000,
        },
        {
          monthlyNetIncomeGbp: 4000,
          monthlyEssentialBillsGbp: 2000,
          emergencyFundGbp: 20000,
          cashSavingsYieldApr: 5,
          annualIsaContributionGbp: 20000,
          adjustedNetIncomeGbp: 50000,
        },
      ]) {
        texts.push(...calculateFinancialHealthScore({ stage, ...input }).observations);
      }
    }
    for (const evaluation of [
      evaluateFinancialStage({
        debts: [
          {
            id: "1",
            name: "Card",
            balance: 2000,
            apr: 24.9,
            minimumPayment: 50,
            type: "credit_card",
          },
        ],
        monthlySurplus: 200,
        liquidSavings: 500,
        monthlyEssentialExpenses: 1500,
      }),
      evaluateFinancialStage({
        debts: [],
        monthlySurplus: 500,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      }),
      evaluateFinancialStage({
        debts: [],
        monthlySurplus: 1000,
        liquidSavings: 6000,
        monthlyEssentialExpenses: 1500,
      }),
    ]) {
      texts.push(evaluation.headline, evaluation.subline);
    }
    expect(texts.length).toBeGreaterThan(6);
    for (const text of texts) {
      for (const { id, pattern } of ADVICE_PATTERNS) {
        expect(pattern.test(text), `${id}: ${text}`).toBe(false);
      }
    }
  });

  it("weights emergency living runway for STAGE_2_BUFFER_BUILD", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_2_BUFFER_BUILD",
      totalUnsecuredDebtGbp: 0,
      monthlyNetIncomeGbp: 3200,
      monthlyEssentialBillsGbp: 2000,
      emergencyFundGbp: 12000, // 6 months runway
      cashSavingsYieldApr: 4.8,
    });

    expect(res.stage).toBe("STAGE_2_BUFFER_BUILD");
    expect(res.overallScore).toBeGreaterThanOrEqual(85);
    expect(res.grade).toBe("EXCELLENT");
  });

  it("weights tax allowances and tax trap mitigation for STAGE_3_WEALTH_OPTIMIZE", () => {
    const res = calculateFinancialHealthScore({
      stage: "STAGE_3_WEALTH_OPTIMIZE",
      monthlyNetIncomeGbp: 5500,
      monthlyEssentialBillsGbp: 2500,
      emergencyFundGbp: 20000,
      annualIsaContributionGbp: 20000,
      annualPensionContributionGbp: 30000,
      adjustedNetIncomeGbp: 108000, // In tax trap
    });

    expect(res.stage).toBe("STAGE_3_WEALTH_OPTIMIZE");
    const trapComponent = res.components.find((c) => c.name.includes("£100,000 to £125,140 band"));
    expect(trapComponent).toBeDefined();
    expect(trapComponent?.score).toBe(40);
  });

  describe("calculateSafeToSpend", () => {
    it("computes safe-to-spend weekly and daily metrics", () => {
      const res = calculateSafeToSpend(3000, 1000, 200, 400);
      expect(res.fixedCommitments).toBe(1600);
      expect(res.monthlyDiscretionary).toBe(1400);
      expect(res.weeklyAllowance).toBeCloseTo(323.08, 1);
      expect(res.dailyAllowance).toBeCloseTo(46.15, 1);
    });
  });

  describe("evaluateFinancialStage", () => {
    it("evaluates Stage 1 for high interest debt", () => {
      const res = evaluateFinancialStage({
        debts: [
          {
            id: "1",
            name: "Card",
            balance: 2000,
            apr: 24.9,
            minimumPayment: 50,
            type: "credit_card",
          },
        ],
        monthlySurplus: 200,
        liquidSavings: 500,
        monthlyEssentialExpenses: 1500,
      });
      expect(res.stage).toBe("stabilize");
      expect(res.canonicalStage).toBe("STAGE_1_DEBT_RECOVERY");
    });

    it("evaluates Stage 2 when debt is cleared but runway < 3 months", () => {
      const res = evaluateFinancialStage({
        debts: [],
        monthlySurplus: 500,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      });
      expect(res.stage).toBe("buffer");
      expect(res.canonicalStage).toBe("STAGE_2_BUFFER_BUILD");
    });

    it("evaluates Stage 3 when debt is cleared and runway >= 3 months", () => {
      const res = evaluateFinancialStage({
        debts: [],
        monthlySurplus: 1000,
        liquidSavings: 6000,
        monthlyEssentialExpenses: 1500,
      });
      expect(res.stage).toBe("optimize");
      expect(res.canonicalStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
    });
  });
});

describe("isHighInterestDebt", () => {
  it("flags cards, overdrafts and APR of 6.5% or more", () => {
    expect(isHighInterestDebt({ id: "a", name: "Card", apr: 22.9, type: "credit_card" })).toBe(
      true,
    );
    expect(isHighInterestDebt({ id: "b", name: "OD", apr: 0, type: "overdraft" })).toBe(true);
    expect(isHighInterestDebt({ id: "c", name: "Loan", apr: 6.5, type: "loan" })).toBe(true);
  });
  it("does not flag a 3% loan", () => {
    expect(isHighInterestDebt({ id: "d", name: "Loan", apr: 3, type: "loan" })).toBe(false);
  });
});

const stage1 = (input: Omit<HealthScoreInput, "stage">) =>
  calculateFinancialHealthScore({ stage: "STAGE_1_DEBT_RECOVERY", ...input });
const stage2 = (input: Omit<HealthScoreInput, "stage">) =>
  calculateFinancialHealthScore({ stage: "STAGE_2_BUFFER_BUILD", ...input });
const stage3 = (input: Omit<HealthScoreInput, "stage">) =>
  calculateFinancialHealthScore({ stage: "STAGE_3_WEALTH_OPTIMIZE", ...input });

// Component order, as the function documents it: stage 1 is debt, cash flow, starter buffer;
// stage 2 is breathing room, savings rate, debt; stage 3 is allowances, the taper band, breathing room.

describe("stage 1 card, loan and overdraft debt score", () => {
  const debtScore = (highInterestDebtGbp: number) =>
    stage1({ highInterestDebtGbp }).components[0]?.score;

  it.each([
    // Bands: over £10,000 is 20, over £5,000 is 40, over £1,000 is 65, over £0 is 80, none is 100.
    [10001, 20],
    [10000, 40],
    [5001, 40],
    [5000, 65],
    [1001, 65],
    [1000, 80],
    [1, 80],
    [0, 100],
  ])("scores £%i of high-interest debt as %i", (debt, expected) => {
    expect(debtScore(debt)).toBe(expected);
  });

  it("uses total unsecured debt when the high-interest figure is not given", () => {
    // £2,000 total, no high-interest figure: £2,000 falls in the over £1,000 band, so 65.
    expect(stage1({ totalUnsecuredDebtGbp: 2000 }).components[0]?.score).toBe(65);
    // A high-interest figure of £0 is used as given, not replaced by the total: 100.
    expect(
      stage1({ totalUnsecuredDebtGbp: 2000, highInterestDebtGbp: 0 }).components[0]?.score,
    ).toBe(100);
  });

  it("names the debt amount in the comment and observation, and says none when there is none", () => {
    // Surplus £500 and £1,000 saved, so the only possible observation is the debt one.
    const base = {
      monthlyNetIncomeGbp: 2000,
      monthlyEssentialBillsGbp: 1500,
      emergencyFundGbp: 1000,
    };
    const withDebt = stage1({ ...base, highInterestDebtGbp: 6500 });
    expect(withDebt.components[0]?.comment).toContain("£6,500");
    expect(withDebt.observations).toHaveLength(1);
    expect(withDebt.observations[0]).toContain("£6,500");

    const noDebt = stage1({ ...base, highInterestDebtGbp: 0 });
    expect(noDebt.components[0]?.comment).not.toContain("£");
    expect(noDebt.observations).toEqual([]);
  });
});

describe("stage 1 cash flow score", () => {
  // Surplus = net income - (essential bills + minimum debt payments).
  const cashFlow = (net: number, bills: number, minimum: number) =>
    stage1({
      monthlyNetIncomeGbp: net,
      monthlyEssentialBillsGbp: bills,
      monthlyMinimumDebtPaymentGbp: minimum,
    }).components[1];

  it.each([
    // 2,300 - (1,500 + 500) = 300: £300 or more scores 95.
    [2300, 95],
    // 299: positive but under £300 scores 75.
    [2299, 75],
    // 1: still positive, 75.
    [2001, 75],
    // 0: breaks even, 50.
    [2000, 50],
    // -200: 50 - 200 / 10 = 30.
    [1800, 30],
    // -500: 50 - 50 = 0, floored at 10.
    [1500, 10],
  ])("with £%i net income against £2,000 of outgoings scores %i", (net, expected) => {
    expect(cashFlow(net, 1500, 500)?.score).toBe(expected);
  });

  it("counts minimum debt payments as outgoings", () => {
    // Without the £500 minimum the surplus would be £500 (95); with it, £0 (50).
    expect(cashFlow(2000, 1500, 0)?.score).toBe(95);
    expect(cashFlow(2000, 1500, 500)?.score).toBe(50);
  });

  it("says how much is left over, or how far short, with the amount", () => {
    const over = cashFlow(2300, 1500, 500);
    expect(over?.comment).toContain("£300");
    expect(over?.comment).not.toContain("Short");
    expect(cashFlow(2000, 1500, 500)?.comment).not.toContain("Short");
    expect(cashFlow(1800, 1500, 500)?.comment).toContain("Short by £200");
  });

  it("adds an observation with the shortfall only when outgoings exceed income", () => {
    // £1,000 saved and no debt, so the shortfall is the only possible observation.
    const base = { monthlyEssentialBillsGbp: 1500, emergencyFundGbp: 1000, highInterestDebtGbp: 0 };
    const short = stage1({ ...base, monthlyNetIncomeGbp: 1300 });
    expect(short.observations).toHaveLength(1);
    expect(short.observations[0]).toContain("£200");
    expect(stage1({ ...base, monthlyNetIncomeGbp: 1500 }).observations).toEqual([]);
  });
});

describe("stage 1 starter buffer score", () => {
  const buffer = (emergencyFundGbp: number) => stage1({ emergencyFundGbp });

  it("scores savings as a share of £1,000, capped at 100", () => {
    // 500 / 1,000 * 100 = 50; 1,000 and 1,500 both reach the cap of 100.
    expect(buffer(500).components[2]?.score).toBe(50);
    expect(buffer(1000).components[2]?.score).toBe(100);
    expect(buffer(1500).components[2]?.score).toBe(100);
  });

  it("names the savings and adds an observation only under £1,000", () => {
    // Income above outgoings and no debt, so the savings note is the only possible observation.
    const base = {
      monthlyNetIncomeGbp: 2000,
      monthlyEssentialBillsGbp: 1500,
      highInterestDebtGbp: 0,
    };
    const under = stage1({ ...base, emergencyFundGbp: 999 });
    expect(under.components[2]?.comment).toContain("£999");
    expect(under.observations).toHaveLength(1);
    expect(under.observations[0]).toContain("£999");
    expect(stage1({ ...base, emergencyFundGbp: 1000 }).observations).toEqual([]);
  });
});

describe("stage 2 breathing room score", () => {
  // Runway = savings / essential bills; bills of £1,000 make the savings figure read as months.
  const runway = (emergencyFundGbp: number) =>
    stage2({ monthlyEssentialBillsGbp: 1000, emergencyFundGbp, cashSavingsYieldApr: 4.5 });

  it.each([
    // 6 months or more: 100.
    [6000, 100],
    // 4.5 months: 80 + (1.5 / 3) * 20 = 90.
    [4500, 90],
    // 3 months: 80 + 0 = 80.
    [3000, 80],
    // 1.5 months: (1.5 / 3) * 80 = 40.
    [1500, 40],
    // 0 months: 0.
    [0, 0],
  ])("scores £%i saved against £1,000 a month as %i", (fund, expected) => {
    expect(runway(fund).components[0]?.score).toBe(expected);
  });

  it("states the months covered and observes only under 3 months", () => {
    expect(runway(1500).components[0]?.comment).toContain("1.5 months");
    // Yield 4.5% and no debt leave the runway as the only possible observation.
    const under = runway(2900);
    expect(under.observations).toHaveLength(1);
    expect(under.observations[0]).toContain("2.9 months");
    expect(runway(3000).observations).toEqual([]);
  });

  it("reads savings against at least £1 of bills when bills are missing", () => {
    // Bills default to £1, so £6 saved is 6 months: 100.
    expect(stage2({ emergencyFundGbp: 6 }).components[0]?.score).toBe(100);
  });
});

describe("stage 2 savings rate score", () => {
  const rate = (cashSavingsYieldApr?: number) =>
    stage2({ monthlyEssentialBillsGbp: 1000, emergencyFundGbp: 6000, cashSavingsYieldApr });

  it.each([
    // 4.5% or more: 100; 3.5% to under 4.5%: 75; under 3.5%: 40.
    [4.5, 100],
    [4.4, 75],
    [3.5, 75],
    [3.4, 40],
  ])("scores %f%% AER as %i", (apr, expected) => {
    expect(rate(apr).components[1]?.score).toBe(expected);
  });

  it("assumes 3.5% when no rate is saved", () => {
    // 3.5% sits in the 75 band.
    expect(rate(undefined).components[1]?.score).toBe(75);
  });

  it("states the rate and observes only under 4.0%", () => {
    expect(rate(4.8).components[1]?.comment).toContain("4.8%");
    // Six months saved and no debt, so the rate is the only possible observation.
    const low = rate(3.9);
    expect(low.observations).toHaveLength(1);
    expect(low.observations[0]).toContain("3.9%");
    expect(rate(4.0).observations).toEqual([]);
  });
});

describe("stage 2 debt score", () => {
  const debt = (totalUnsecuredDebtGbp: number) => stage2({ totalUnsecuredDebtGbp }).components[2];

  it.each([
    // No debt: 100. Otherwise 100 - (debt / 500) * 20, floored at 0.
    [0, 100],
    // 100 - 2 * 20 = 60.
    [1000, 60],
    // 100 - 6 * 20 = -20, floored at 0.
    [3000, 0],
  ])("scores £%i of debt as %i", (amount, expected) => {
    expect(debt(amount)?.score).toBe(expected);
  });

  it("names the debt amount, and none when there is none", () => {
    expect(debt(1000)?.comment).toContain("£1,000");
    expect(debt(0)?.comment).not.toContain("£");
  });
});

describe("stage 3 allowance score", () => {
  const allowance = (isa: number, pension: number) =>
    stage3({ annualIsaContributionGbp: isa, annualPensionContributionGbp: pension }).components[0];

  it("gives half the score to each allowance, each capped at fully used", () => {
    // Amounts far above either allowance count as fully used: ratio 1.
    // Neither: 0. ISA only: 1 * 0.5 * 100 = 50. Pension only: 50. Both: 100.
    expect(allowance(0, 0)?.score).toBe(0);
    expect(allowance(1e9, 0)?.score).toBe(50);
    expect(allowance(0, 1e9)?.score).toBe(50);
    expect(allowance(1e9, 1e9)?.score).toBe(100);
  });

  it("scores a token pension contribution as close to nothing", () => {
    // £1 against an allowance in the tens of thousands rounds to 0.
    expect(allowance(0, 1)?.score).toBe(0);
  });

  it("names the ISA amount used and observes nothing when the ISA is fully used", () => {
    expect(allowance(5000, 0)?.comment).toContain("£5,000");
    // No adjusted income, so no taper observation either.
    expect(stage3({ annualIsaContributionGbp: 1e9, adjustedNetIncomeGbp: 0 }).observations).toEqual(
      [],
    );
  });
});

describe("stage 3 taper band score", () => {
  // The band is read from the latest year's rules, so this test does not assert a tax figure.
  const rules = getUkTaxYearRules(getLatestSupportedUkTaxYear());
  const start = rules.ewni.personalAllowanceTaperStart;
  const end = rules.taperEnd;
  const band = (adjustedNetIncomeGbp: number) =>
    stage3({ adjustedNetIncomeGbp, annualIsaContributionGbp: 1e9 }).components[1];

  it("scores 100 up to the taper start, 40 inside the band and 70 above it", () => {
    expect(band(start)?.score).toBe(100);
    expect(band(start + 1)?.score).toBe(40);
    expect(band(end)?.score).toBe(40);
    expect(band(end + 1)?.score).toBe(70);
  });

  it("words the comment the same inside the band and differently outside it", () => {
    const inside = band(start + 1)?.comment;
    expect(band(end)?.comment).toBe(inside);
    expect(band(start)?.comment).not.toBe(inside);
    expect(band(end + 1)?.comment).not.toBe(inside);
    expect(band(end + 1)?.comment).toBe(band(start)?.comment);
  });
});

describe("stage 3 breathing room score", () => {
  it("scores runway as a share of 6 months, capped at 100", () => {
    // 3,000 / 1,000 = 3 months: 3 / 6 * 100 = 50. 12 months: 200, capped at 100.
    const at = (fund: number) =>
      stage3({ monthlyEssentialBillsGbp: 1000, emergencyFundGbp: fund }).components[2];
    expect(at(3000)?.score).toBe(50);
    expect(at(12000)?.score).toBe(100);
    expect(at(3000)?.comment).toContain("3 months");
  });
});

describe("every component", () => {
  it("has a name and a comment in each stage", () => {
    const results = [
      stage1({ highInterestDebtGbp: 0, monthlyNetIncomeGbp: 0, emergencyFundGbp: 0 }),
      stage1({ highInterestDebtGbp: 500, monthlyNetIncomeGbp: 5000, emergencyFundGbp: 0 }),
      stage2({ totalUnsecuredDebtGbp: 0 }),
      stage2({ totalUnsecuredDebtGbp: 100 }),
      stage3({ adjustedNetIncomeGbp: 0 }),
      stage3({ adjustedNetIncomeGbp: 110000 }),
    ];
    for (const result of results) {
      expect(result.components).toHaveLength(3);
      for (const component of result.components) {
        expect(component.name.length).toBeGreaterThan(0);
        expect(component.comment.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("overall grade", () => {
  // Stage 1 weights: debt 0.4, cash flow 0.35, buffer 0.25. No debt scores 100 (40 points).
  // Buffer score = savings / 10 for savings up to £1,000.
  const graded = (surplusIncome: number, highInterestDebtGbp: number, emergencyFundGbp: number) =>
    stage1({
      monthlyNetIncomeGbp: surplusIncome,
      monthlyEssentialBillsGbp: 1000,
      highInterestDebtGbp,
      emergencyFundGbp,
    });

  it.each([
    // Surplus 300 (95 * 0.35 = 33.25) + 40 + buffer 47 * 0.25 = 11.75: 85.
    [1300, 0, 470, 85, "EXCELLENT"],
    // Buffer 43: 40 + 33.25 + 10.75 = 84.
    [1300, 0, 430, 84, "GOOD"],
    // Surplus 1 (75 * 0.35 = 26.25) + 40 + buffer 15 * 0.25 = 3.75: 70.
    [1001, 0, 150, 70, "GOOD"],
    // Buffer 11: 40 + 26.25 + 2.75 = 69.
    [1001, 0, 110, 69, "NEEDS_ATTENTION"],
    // Debt over £10,000 (20 * 0.4 = 8) + surplus 0 (50 * 0.35 = 17.5) + buffer 98 * 0.25 = 24.5: 50.
    [1000, 20000, 980, 50, "NEEDS_ATTENTION"],
    // Buffer 94: 8 + 17.5 + 23.5 = 49.
    [1000, 20000, 940, 49, "CRITICAL"],
    // Buffer 2: 8 + 17.5 + 0.5 = 26.
    [1000, 20000, 20, 26, "CRITICAL"],
  ])("income %i, debt %i, savings %i scores %i (%s)", (income, debt, fund, score, grade) => {
    const result = graded(income, debt, fund);
    expect(result.overallScore).toBe(score);
    expect(result.grade).toBe(grade);
  });
});

describe("isHighInterestDebt for cards", () => {
  it("flags a credit card at 0%", () => {
    expect(isHighInterestDebt({ id: "e", name: "Card", apr: 0, type: "credit_card" })).toBe(true);
  });
});

describe("evaluateFinancialStage figures", () => {
  const card = (balance: number) => ({
    id: "card",
    name: "Card",
    balance,
    apr: 20,
    type: "credit_card" as const,
  });
  const cheapLoan = { id: "loan", name: "Loan", balance: 1000, apr: 3, type: "loan" as const };

  it("totals all consumer debt and counts only high-interest debt as high interest", () => {
    // Card £2,000 (high) + 3% loan £1,000 (not high): total £3,000, high £2,000.
    const res = evaluateFinancialStage({
      debts: [card(2000), cheapLoan],
      monthlySurplus: 100,
      liquidSavings: 0,
      monthlyEssentialExpenses: 1000,
    });
    expect(res.totalUnsecuredDebt).toBe(3000);
    expect(res.highInterestDebt).toBe(2000);
    expect(res.primaryHeroMetric).toBe("unsecured_debt");
    expect(res.headline.length).toBeGreaterThan(0);
    expect(res.subline.length).toBeGreaterThan(0);
  });

  it("treats £50 of high-interest debt as cleared and £51 as not", () => {
    // Stage 1 needs high-interest debt over £50. Six months saved, so £50 lands in stage 3.
    const at = (balance: number) =>
      evaluateFinancialStage({
        debts: [card(balance)],
        monthlySurplus: 100,
        liquidSavings: 6000,
        monthlyEssentialExpenses: 1000,
      }).stage;
    expect(at(50)).toBe("optimize");
    expect(at(51)).toBe("stabilize");
  });

  it("puts a negative surplus in stage 1 and a zero surplus outside it", () => {
    const at = (monthlySurplus: number) =>
      evaluateFinancialStage({
        debts: [],
        monthlySurplus,
        liquidSavings: 6000,
        monthlyEssentialExpenses: 1000,
      }).stage;
    expect(at(-1)).toBe("stabilize");
    expect(at(0)).toBe("optimize");
  });

  it("moves to stage 3 at exactly 3 months of runway", () => {
    const at = (liquidSavings: number) =>
      evaluateFinancialStage({
        debts: [],
        monthlySurplus: 100,
        liquidSavings,
        monthlyEssentialExpenses: 1000,
      });
    // 3,000 / 1,000 = 3.0 months: stage 3. 2,900 / 1,000 = 2.9: stage 2.
    const three = at(3000);
    expect(three.stage).toBe("optimize");
    expect(three.primaryHeroMetric).toBe("net_worth");
    expect(three.starterBufferMet).toBe(true);
    expect(three.headline.length).toBeGreaterThan(0);
    expect(three.subline.length).toBeGreaterThan(0);
    const under = at(2900);
    expect(under.stage).toBe("buffer");
    expect(under.emergencyRunwayMonths).toBe(2.9);
    expect(under.primaryHeroMetric).toBe("emergency_runway");
    expect(under.headline.length).toBeGreaterThan(0);
    expect(under.subline.length).toBeGreaterThan(0);
  });

  it("marks the £1,000 starter buffer as met at exactly £1,000", () => {
    // £1,000 against £1,000 a month is 1 month of runway, so stage 2 reports the buffer.
    const at = (liquidSavings: number) =>
      evaluateFinancialStage({
        debts: [],
        monthlySurplus: 100,
        liquidSavings,
        monthlyEssentialExpenses: 1000,
      }).starterBufferMet;
    expect(at(1000)).toBe(true);
    expect(at(999)).toBe(false);
  });

  it("reports no runway when there are no essential expenses", () => {
    const res = evaluateFinancialStage({
      debts: [],
      monthlySurplus: 100,
      liquidSavings: 500,
      monthlyEssentialExpenses: 0,
    });
    expect(res.emergencyRunwayMonths).toBe(0);
  });
});
