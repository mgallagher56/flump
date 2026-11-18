import { monthlyRateFromAer } from "./savings-interest.js";
import type {
  CompoundTrajectoryPoint,
  CompoundTrajectoryResult,
  ForecastResult,
  ForecastYearPoint,
  LifeEventScenario,
} from "./types.js";

export interface ForecastInput {
  currentAge?: number;
  initialCashGbp?: number;
  initialIsaGbp?: number;
  initialPensionGbp?: number;
  initialDebtGbp?: number;
  initialPropertyEquityGbp?: number;
  monthlySavingsGbp?: number;
  monthlyPensionContributionGbp?: number;
  annualCashInterestPct?: number; // default 4.0%
  annualIsaReturnPct?: number; // default 6.0%
  annualPensionReturnPct?: number; // default 6.5%
  annualPropertyGrowthPct?: number; // default 2.5%
  scenarios?: LifeEventScenario[];
  projectionYears?: number; // default 30
}

/**
 * Calculates 30-Year Compound Growth & Life Event Scenario Projections.
 */
export function calculateForecast(input: ForecastInput): ForecastResult {
  const currentAge = input.currentAge ?? 30;
  let cashBaseline = Math.max(0, input.initialCashGbp ?? 0);
  let isaBaseline = Math.max(0, input.initialIsaGbp ?? 0);
  let pensionBaseline = Math.max(0, input.initialPensionGbp ?? 0);
  let debtBaseline = Math.max(0, input.initialDebtGbp ?? 0);
  let propertyEquityBaseline = Math.max(0, input.initialPropertyEquityGbp ?? 0);

  let cashScenario = cashBaseline;
  let isaScenario = isaBaseline;
  let pensionScenario = pensionBaseline;
  let debtScenario = debtBaseline;
  let propertyEquityScenario = propertyEquityBaseline;

  const monthlySavings = Math.max(0, input.monthlySavingsGbp ?? 0);
  const monthlyPension = Math.max(0, input.monthlyPensionContributionGbp ?? 0);

  const cashRate = (input.annualCashInterestPct ?? 4.0) / 100;
  const isaRate = (input.annualIsaReturnPct ?? 6.0) / 100;
  const pensionRate = (input.annualPensionReturnPct ?? 6.5) / 100;
  const propertyGrowthRate = (input.annualPropertyGrowthPct ?? 2.5) / 100;

  const scenarios = input.scenarios ?? [];
  const years = input.projectionYears ?? 30;

  const startingNetWorth =
    cashBaseline + isaBaseline + pensionBaseline + propertyEquityBaseline - debtBaseline;

  const trajectory: ForecastYearPoint[] = [
    {
      year: 0,
      age: currentAge,
      baselineNetWorthGbp: Math.round(startingNetWorth),
      scenarioNetWorthGbp: Math.round(startingNetWorth),
      isaBalanceGbp: Math.round(isaBaseline),
      pensionBalanceGbp: Math.round(pensionBaseline),
      cashBalanceGbp: Math.round(cashBaseline),
      debtBalanceGbp: Math.round(debtBaseline),
      propertyEquityGbp: Math.round(propertyEquityBaseline),
    },
  ];

  for (let y = 1; y <= years; y++) {
    // 1. Grow Baseline
    // Debt payments come out of savings first; only the remainder is invested.
    const annualSavingsTotal = monthlySavings * 12;
    const debtPaymentYearly = Math.min(debtBaseline, annualSavingsTotal);
    debtBaseline = Math.max(0, debtBaseline - debtPaymentYearly);
    const investableSavings = annualSavingsTotal - debtPaymentYearly;

    // Allocate remaining savings to ISA (capped at £20k) and cash
    const isaContribution = Math.min(20000, investableSavings);
    const cashContribution = Math.max(0, investableSavings - isaContribution);

    isaBaseline = (isaBaseline + isaContribution) * (1 + isaRate);
    cashBaseline = (cashBaseline + cashContribution) * (1 + cashRate);
    pensionBaseline = (pensionBaseline + monthlyPension * 12) * (1 + pensionRate);
    propertyEquityBaseline = propertyEquityBaseline * (1 + propertyGrowthRate);

    const baselineNetWorth =
      cashBaseline + isaBaseline + pensionBaseline + propertyEquityBaseline - debtBaseline;

    // 2. Grow Scenario with Life Events applied
    // Check if any scenario applies to year `y`
    let extraMonthlyCost = 0;
    let extraLumpSumCost = 0;
    let extraPropertyEquity = 0;

    for (const sc of scenarios) {
      const isDuringEvent = y >= sc.startYear && y < sc.startYear + (sc.durationYears ?? 1);
      const isStartOfEvent = y === sc.startYear;

      if (isDuringEvent) {
        extraMonthlyCost += sc.ongoingMonthlyDeltaGbp;
      }

      if (isStartOfEvent && sc.lumpSumCostGbp) {
        extraLumpSumCost += sc.lumpSumCostGbp;
        if (sc.type === "BUY_HOME") {
          // Lump sum turns into property equity
          extraPropertyEquity += sc.lumpSumCostGbp;
        }
      }
    }

    // Apply scenario costs: draw from cash, then ISA, then add to debt
    const drawDown = (amount: number): void => {
      const fromCash = Math.min(cashScenario, amount);
      cashScenario -= fromCash;
      const fromIsa = Math.min(isaScenario, amount - fromCash);
      isaScenario -= fromIsa;
      debtScenario += amount - fromCash - fromIsa;
    };

    if (extraLumpSumCost > 0) {
      drawDown(extraLumpSumCost);
    }

    // Net annual cash flow after ongoing scenario costs; a deficit is funded, not dropped
    const netSavingsForScenario = annualSavingsTotal - extraMonthlyCost * 12;
    let availableSavingsForScenario = Math.max(0, netSavingsForScenario);
    if (netSavingsForScenario < 0) {
      drawDown(-netSavingsForScenario);
    }

    // Scenario debt paydown
    if (debtScenario > 0) {
      const paydown = Math.min(debtScenario, availableSavingsForScenario);
      debtScenario = Math.max(0, debtScenario - paydown);
      availableSavingsForScenario -= paydown;
    }

    const scIsaContrib = Math.min(20000, availableSavingsForScenario);
    const scCashContrib = Math.max(0, availableSavingsForScenario - scIsaContrib);

    isaScenario = (isaScenario + scIsaContrib) * (1 + isaRate);
    cashScenario = (cashScenario + scCashContrib) * (1 + cashRate);
    pensionScenario = (pensionScenario + monthlyPension * 12) * (1 + pensionRate);
    propertyEquityScenario =
      (propertyEquityScenario + extraPropertyEquity) * (1 + propertyGrowthRate);

    const scenarioNetWorth =
      cashScenario + isaScenario + pensionScenario + propertyEquityScenario - debtScenario;

    trajectory.push({
      year: y,
      age: currentAge + y,
      baselineNetWorthGbp: Math.round(baselineNetWorth),
      scenarioNetWorthGbp: Math.round(scenarioNetWorth),
      isaBalanceGbp: Math.round(isaScenario),
      pensionBalanceGbp: Math.round(pensionScenario),
      cashBalanceGbp: Math.round(cashScenario),
      debtBalanceGbp: Math.round(debtScenario),
      propertyEquityGbp: Math.round(propertyEquityScenario),
    });
  }

  const tenYearIndex = Math.min(10, years);
  const tenYearBaseline = trajectory[tenYearIndex]?.baselineNetWorthGbp ?? 0;
  const tenYearScenario = trajectory[tenYearIndex]?.scenarioNetWorthGbp ?? 0;
  const thirtyYearBaseline = trajectory[years]?.baselineNetWorthGbp ?? 0;
  const thirtyYearScenario = trajectory[years]?.scenarioNetWorthGbp ?? 0;

  return {
    startingNetWorthGbp: Math.round(startingNetWorth),
    trajectory,
    tenYearNetWorthBaselineGbp: tenYearBaseline,
    tenYearNetWorthScenarioGbp: tenYearScenario,
    thirtyYearNetWorthBaselineGbp: thirtyYearBaseline,
    thirtyYearNetWorthScenarioGbp: thirtyYearScenario,
  };
}

/**
 * Calculates compound trajectory over a given number of years.
 */
export function calculateCompoundTrajectory(
  initialPrincipal: number,
  monthlyContribution: number,
  annualReturnRatePct = 5,
  years = 10,
): CompoundTrajectoryResult {
  const principal = Math.max(0, initialPrincipal || 0);
  const monthly = Math.max(0, monthlyContribution || 0);
  const rate = Math.max(0, annualReturnRatePct || 0) / 100;
  const monthlyRate = rate / 12;

  let balance = principal;
  let totalContributed = principal;
  const points: CompoundTrajectoryPoint[] = [
    { year: 0, contributions: principal, interest: 0, total: principal },
  ];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      totalContributed += monthly;
    }
    const totalInterest = Math.max(0, balance - totalContributed);
    points.push({
      year: y,
      contributions: Math.round(totalContributed),
      interest: Math.round(totalInterest),
      total: Math.round(balance),
    });
  }

  const finalInterest = Math.max(0, balance - totalContributed);

  return {
    endBalance: Math.round(balance),
    totalContributions: Math.round(totalContributed),
    totalInterest: Math.round(finalInterest),
    points,
  };
}

/**
 * Future value of a principal with regular monthly contributions compounded at `monthlyRate`
 * over `months` whole months. Handles `monthlyRate <= 0` without division by zero.
 */
export function futureValue(
  principal: number,
  monthlyContribution: number,
  monthlyRate: number,
  months: number,
): number {
  const safePrincipal = Number.isFinite(principal) && principal > 0 ? principal : 0;
  const safeMonthly =
    Number.isFinite(monthlyContribution) && monthlyContribution > 0 ? monthlyContribution : 0;
  const wholeMonths = Math.max(0, Math.round(months));
  if (!(monthlyRate > 0) || !Number.isFinite(monthlyRate)) {
    return safePrincipal + safeMonthly * wholeMonths;
  }
  let balance = safePrincipal;
  for (let m = 0; m < wholeMonths; m++) {
    balance = balance * (1 + monthlyRate) + safeMonthly;
  }
  return balance;
}

/**
 * Compound interest earned over `months` (default 12) at `annualRatePct` with regular monthly
 * contributions. Returns 0 when the rate is zero or negative.
 */
export function calculateCompoundInterestEarned(
  balance: number,
  annualRatePct: number,
  monthlyContribution: number,
  months = 12,
): number {
  if (!(annualRatePct > 0) || !Number.isFinite(annualRatePct)) return 0;
  const wholeMonths = Math.max(0, Math.round(months));
  const endBalance = futureValue(
    balance,
    monthlyContribution,
    annualRatePct / 100 / 12,
    wholeMonths,
  );
  const safePrincipal = Number.isFinite(balance) && balance > 0 ? balance : 0;
  const safeMonthly =
    Number.isFinite(monthlyContribution) && monthlyContribution > 0 ? monthlyContribution : 0;
  return Math.max(0, endBalance - safePrincipal - safeMonthly * wholeMonths);
}

export interface SavingsCompoundProjectionInput {
  starting: number;
  monthly: number;
  annualRatePct: number;
  years: number;
}

export interface SavingsCompoundProjection {
  points: { year: number; balance: number }[];
  final: number;
  paidIn: number;
  interest: number;
  flat: boolean;
}

/**
 * Projects a savings balance over whole years with monthly compounding and monthly additions
 * (each added at the end of its month). `annualRatePct` is an AER, so each month grows by the
 * monthly equivalent (1 + AER/100)^(1/12) − 1, the same basis as the savings interest headline:
 * a year with no additions grows by exactly the AER.
 */
export function projectCompoundSavings(
  input: SavingsCompoundProjectionInput,
): SavingsCompoundProjection {
  const starting = Number.isFinite(input.starting) && input.starting > 0 ? input.starting : 0;
  const monthly = Number.isFinite(input.monthly) && input.monthly > 0 ? input.monthly : 0;
  const years = Math.max(0, Math.round(input.years));
  const rate =
    Number.isFinite(input.annualRatePct) && input.annualRatePct > 0 ? input.annualRatePct : 0;
  const monthlyRate = monthlyRateFromAer(rate);

  const points: { year: number; balance: number }[] = [{ year: 0, balance: Math.round(starting) }];
  let balance = starting;
  for (let year = 1; year <= years; year += 1) {
    balance = futureValue(balance, monthly, monthlyRate, 12);
    points.push({ year, balance: Math.round(balance) });
  }

  const paidIn = monthly * 12 * years;
  return {
    points,
    final: balance,
    paidIn,
    interest: Math.max(0, balance - starting - paidIn),
    flat: monthly <= 0 && (rate <= 0 || starting <= 0),
  };
}

export type SavingsGoalMonthsResult =
  | { status: "reached" }
  | { status: "months"; months: number }
  | { status: "not-reached" };

/**
 * Months until a monthly-compounding savings balance first reaches `goal`, searching up to
 * `maxMonths` (default 600 = 50 years). `annualRatePct` is an AER, compounded monthly at its
 * monthly equivalent, the same as `projectCompoundSavings`.
 */
export function calculateMonthsToSavingsGoal(input: {
  starting: number;
  monthly: number;
  annualRatePct: number;
  goal: number;
  maxMonths?: number;
}): SavingsGoalMonthsResult {
  const starting = Number.isFinite(input.starting) && input.starting > 0 ? input.starting : 0;
  if (starting >= input.goal) return { status: "reached" };
  const monthly = Number.isFinite(input.monthly) && input.monthly > 0 ? input.monthly : 0;
  const rate =
    Number.isFinite(input.annualRatePct) && input.annualRatePct > 0 ? input.annualRatePct : 0;
  const monthlyRate = monthlyRateFromAer(rate);
  const maxMonths = input.maxMonths ?? 600;
  let balance = starting;
  for (let months = 1; months <= maxMonths; months += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    if (balance >= input.goal) return { status: "months", months };
  }
  return { status: "not-reached" };
}
