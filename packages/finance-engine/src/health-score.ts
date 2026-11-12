import { filterConsumerDebts, normalizeDebtItem } from "./debt-payoff.js";
import type {
  DebtItem,
  FinancialStage,
  FinancialStageEvaluation,
  HealthScoreComponent,
  HealthScoreResult,
  SafeToSpendResult,
} from "./types.js";

export interface HealthScoreInput {
  stage: FinancialStage;
  totalUnsecuredDebtGbp?: number;
  highInterestDebtGbp?: number; // Debt with APR > 10%
  totalMonthlyDebtPaymentGbp?: number;
  monthlyMinimumDebtPaymentGbp?: number;
  monthlyEssentialBillsGbp?: number;
  monthlyNetIncomeGbp?: number;
  emergencyFundGbp?: number;
  cashSavingsYieldApr?: number;
  annualIsaContributionGbp?: number;
  annualPensionContributionGbp?: number;
  adjustedNetIncomeGbp?: number;
}

/**
 * Calculates a stage-weighted Financial Health Score (0 - 100).
 */
export function calculateFinancialHealthScore(input: HealthScoreInput): HealthScoreResult {
  const stage = input.stage;
  const components: HealthScoreComponent[] = [];
  const observations: string[] = [];

  const netIncome = Math.max(0, input.monthlyNetIncomeGbp ?? 0);
  const essentialBills = Math.max(1, input.monthlyEssentialBillsGbp ?? 1);
  const totalDebt = Math.max(0, input.totalUnsecuredDebtGbp ?? 0);
  const highInterestDebt = Math.max(0, input.highInterestDebtGbp ?? totalDebt);
  const emergencyFund = Math.max(0, input.emergencyFundGbp ?? 0);
  const runwayMonths = essentialBills > 0 ? emergencyFund / essentialBills : 0;

  if (stage === "STAGE_1_DEBT_RECOVERY") {
    // 1. High-interest debt load (Weight 0.40)
    let debtScore = 100;
    if (highInterestDebt > 10000) debtScore = 20;
    else if (highInterestDebt > 5000) debtScore = 40;
    else if (highInterestDebt > 1000) debtScore = 65;
    else if (highInterestDebt > 0) debtScore = 80;

    components.push({
      name: "High-Interest Debt Load",
      score: debtScore,
      weight: 0.4,
      comment:
        highInterestDebt > 0
          ? `£${highInterestDebt.toLocaleString()} in high-APR credit/overdrafts needing immediate Avalanche payoff.`
          : "Zero high-interest commercial debt.",
    });
    if (highInterestDebt > 0) {
      observations.push(
        `£${Math.round(highInterestDebt).toLocaleString("en-GB")} of high-interest card and overdraft debt is accruing interest.`,
      );
    }

    // 2. Minimum Payment & Priority Bills Coverage (Weight 0.35)
    const totalOutflows = essentialBills + (input.monthlyMinimumDebtPaymentGbp ?? 0);
    const surplus = netIncome - totalOutflows;
    let cashFlowScore = 50;
    if (surplus >= 300) cashFlowScore = 95;
    else if (surplus > 0) cashFlowScore = 75;
    else if (surplus === 0) cashFlowScore = 50;
    else cashFlowScore = Math.max(10, 50 - Math.abs(surplus) / 10);

    components.push({
      name: "Priority Bills & Cash Flow Protection",
      score: Math.min(100, Math.round(cashFlowScore)),
      weight: 0.35,
      comment:
        surplus >= 0
          ? `Safe cash flow surplus of £${Math.round(surplus)}/mo after priority obligations.`
          : `Deficit of £${Math.abs(Math.round(surplus))}/mo. Priority bills are at risk.`,
    });
    if (surplus < 0) {
      observations.push(
        `Priority bills and minimum debt payments exceed net income by £${Math.abs(Math.round(surplus)).toLocaleString("en-GB")} a month.`,
      );
    }

    // 3. Starter Buffer (£1,000) (Weight 0.25)
    const starterScore = Math.min(100, Math.round((emergencyFund / 1000) * 100));
    components.push({
      name: "Starter Buffer (£1k)",
      score: starterScore,
      weight: 0.25,
      comment:
        emergencyFund >= 1000
          ? "£1,000 starter buffer secured to prevent relapsing into debt."
          : `£${Math.round(emergencyFund)} / £1,000 starter buffer established.`,
    });
    if (emergencyFund < 1000) {
      observations.push(
        `Cash savings are £${Math.round(emergencyFund).toLocaleString("en-GB")}, against a £1,000 starter buffer.`,
      );
    }
  } else if (stage === "STAGE_2_BUFFER_BUILD") {
    // 1. Emergency Runway (Weight 0.50) - Target 3-6 months
    let runwayScore = 0;
    if (runwayMonths >= 6) runwayScore = 100;
    else if (runwayMonths >= 3) runwayScore = 80 + ((runwayMonths - 3) / 3) * 20;
    else runwayScore = (runwayMonths / 3) * 80;

    components.push({
      name: "Emergency Living Runway",
      score: Math.min(100, Math.round(runwayScore)),
      weight: 0.5,
      comment: `${runwayMonths.toFixed(1)} months of essential expenses covered (Target: 3-6 months).`,
    });
    if (runwayMonths < 3) {
      observations.push(
        `Cash covers ${runwayMonths.toFixed(1)} months of essential bills; 3 months would be £${Math.round(essentialBills * 3).toLocaleString("en-GB")}.`,
      );
    }

    // 2. Cash Savings Yield Optimization (Weight 0.25)
    const yieldApr = input.cashSavingsYieldApr ?? 3.5;
    let yieldScore = 50;
    if (yieldApr >= 4.5) yieldScore = 100;
    else if (yieldApr >= 3.5) yieldScore = 75;
    else yieldScore = 40;

    components.push({
      name: "Cash yield and allowance optimisation",
      score: yieldScore,
      weight: 0.25,
      comment: `Earning ${yieldApr.toFixed(1)}% AER on liquid savings.`,
    });
    if (yieldApr < 4.0) {
      observations.push(`Cash savings are earning ${yieldApr.toFixed(1)}% AER.`);
    }

    // 3. Debt-Free Maintenance (Weight 0.25)
    const debtFreeScore = totalDebt === 0 ? 100 : Math.max(0, 100 - (totalDebt / 500) * 20);
    components.push({
      name: "Zero Consumer Debt Maintenance",
      score: Math.round(debtFreeScore),
      weight: 0.25,
      comment: totalDebt === 0 ? "No consumer debt." : `£${totalDebt} residual balance remaining.`,
    });
  } else {
    // STAGE_3_WEALTH_OPTIMIZE
    // 1. ISA & SIPP Allowance Utilization (Weight 0.40)
    const isaUsed = input.annualIsaContributionGbp ?? 0;
    const pensionUsed = input.annualPensionContributionGbp ?? 0;
    const isaRatio = Math.min(1, isaUsed / 20000);
    const pensionRatio = Math.min(1, pensionUsed / 60000);
    const allowanceScore = Math.round((isaRatio * 0.5 + pensionRatio * 0.5) * 100);

    components.push({
      name: "Tax-Advantaged Allowance Utilization",
      score: allowanceScore,
      weight: 0.4,
      comment: `Utilized £${Math.round(isaUsed).toLocaleString()} / £20k ISA and £${Math.round(pensionUsed).toLocaleString()} / £60k Pension allowance.`,
    });
    if (isaRatio < 0.5) {
      observations.push(
        `£${Math.round(Math.max(0, 20000 - isaUsed)).toLocaleString("en-GB")} of this tax year's ISA allowance is unused (resets 6 April).`,
      );
    }

    // 2. £100k 60% Tax Trap Mitigation (Weight 0.35)
    const adjIncome = input.adjustedNetIncomeGbp ?? 0;
    let taxTrapScore = 100;
    if (adjIncome > 100000 && adjIncome <= 125140) {
      taxTrapScore = 40;
      observations.push(
        `Adjusted net income is £${Math.round(adjIncome).toLocaleString("en-GB")}, in the £100,000 to £125,140 band where the personal allowance tapers.`,
      );
    } else if (adjIncome > 125140) {
      taxTrapScore = 70;
    }

    components.push({
      name: "£100k Tax Trap Mitigation",
      score: taxTrapScore,
      weight: 0.35,
      comment:
        adjIncome > 100000 && adjIncome <= 125140
          ? "Caught in the UK 60% tax trap (£100k - £125k band)."
          : "Tax band fully optimized or not in 60% trap zone.",
    });

    // 3. Emergency Runway & Liquidity (Weight 0.25)
    const runwayScore = Math.min(100, Math.round((runwayMonths / 6) * 100));
    components.push({
      name: "Runway & Liquid Reserves",
      score: runwayScore,
      weight: 0.25,
      comment: `${runwayMonths.toFixed(1)} months living runway preserved.`,
    });
  }

  // Calculate weighted overall score
  const overallScore = Math.round(components.reduce((sum, c) => sum + c.score * c.weight, 0));

  let grade: HealthScoreResult["grade"] = "CRITICAL";
  if (overallScore >= 85) grade = "EXCELLENT";
  else if (overallScore >= 70) grade = "GOOD";
  else if (overallScore >= 50) grade = "NEEDS_ATTENTION";

  return {
    overallScore,
    stage,
    grade,
    components,
    observations: observations.slice(0, 3),
    /** @deprecated Always empty; use `observations`. Removed after E15 migrates its consumers. */
    topRecommendations: [],
  };
}

/**
 * Calculates Weekly Safe-to-Spend Allowance Metric.
 */
export function calculateSafeToSpend(
  monthlyIncome: number,
  fixedBills: number,
  minDebtPayments: number,
  essentialGroceries: number,
): SafeToSpendResult {
  const fixedCommitments = fixedBills + minDebtPayments + essentialGroceries;
  const monthlyDiscretionary = Math.max(0, monthlyIncome - fixedCommitments);
  // 52 weeks / 12 months = 4.3333 weeks per month
  const weeklyAllowance = Math.round((monthlyDiscretionary / 4.333333) * 100) / 100;
  const dailyAllowance = Math.round((weeklyAllowance / 7) * 100) / 100;

  return {
    weeklyAllowance,
    dailyAllowance,
    monthlyDiscretionary: Math.round(monthlyDiscretionary * 100) / 100,
    fixedCommitments: Math.round(fixedCommitments * 100) / 100,
  };
}

/**
 * A debt is high interest when its APR is at least 6.5% or it is an overdraft or credit card.
 */
export function isHighInterestDebt(d: DebtItem): boolean {
  const n = normalizeDebtItem(d);
  return n.interestRateApr >= 6.5 || n.debtType === "overdraft" || n.debtType === "credit_card";
}

/**
 * Adaptive Financial Lifecycle Stage Evaluator.
 */
export function evaluateFinancialStage(params: {
  debts: DebtItem[];
  monthlySurplus: number;
  liquidSavings: number;
  monthlyEssentialExpenses: number;
}): FinancialStageEvaluation {
  const { debts, monthlySurplus, liquidSavings, monthlyEssentialExpenses } = params;
  const normalizedDebts = debts.map((d) => normalizeDebtItem(d));
  const commercial = filterConsumerDebts(normalizedDebts).consumerDebts;

  const totalUnsecuredDebt = commercial.reduce((sum, d) => sum + d.balanceGbp, 0);
  const highInterestDebt = commercial
    .filter((d) => isHighInterestDebt(d))
    .reduce((sum, d) => sum + d.balanceGbp, 0);

  const emergencyRunwayMonths =
    monthlyEssentialExpenses > 0
      ? Math.round((liquidSavings / monthlyEssentialExpenses) * 10) / 10
      : 0;

  const starterBufferMet = liquidSavings >= 1000;

  // Stage 1: Stabilize & Clear
  if (highInterestDebt > 50 || monthlySurplus < 0) {
    return {
      stage: "stabilize",
      canonicalStage: "STAGE_1_DEBT_RECOVERY",
      totalUnsecuredDebt: Math.round(totalUnsecuredDebt),
      highInterestDebt: Math.round(highInterestDebt),
      monthlySurplus: Math.round(monthlySurplus),
      emergencyRunwayMonths,
      starterBufferMet,
      primaryHeroMetric: "unsecured_debt",
      headline: "Unsecured debt present",
      subline: "High-interest balances or a negative monthly surplus are present.",
    };
  }

  // Stage 2: Buffer & Protect
  if (emergencyRunwayMonths < 3) {
    return {
      stage: "buffer",
      canonicalStage: "STAGE_2_BUFFER_BUILD",
      totalUnsecuredDebt: Math.round(totalUnsecuredDebt),
      highInterestDebt: 0,
      monthlySurplus: Math.round(monthlySurplus),
      emergencyRunwayMonths,
      starterBufferMet,
      primaryHeroMetric: "emergency_runway",
      headline: "Building cash reserves",
      subline: "Cash covers less than 3 months of essential expenses.",
    };
  }

  // Stage 3: Build & Optimize
  return {
    stage: "optimize",
    canonicalStage: "STAGE_3_WEALTH_OPTIMIZE",
    totalUnsecuredDebt: Math.round(totalUnsecuredDebt),
    highInterestDebt: 0,
    monthlySurplus: Math.round(monthlySurplus),
    emergencyRunwayMonths,
    starterBufferMet: true,
    primaryHeroMetric: "net_worth",
    headline: "Reserves in place",
    subline:
      "No high-interest debt, a monthly surplus and at least 3 months of essential expenses in cash.",
  };
}
