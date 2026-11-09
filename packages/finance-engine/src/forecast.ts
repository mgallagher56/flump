import type { ForecastResult, ForecastYearPoint, LifeEventScenario } from "./types.js";

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
    // Pay off debt if any
    if (debtBaseline > 0) {
      const debtPaymentYearly = Math.min(debtBaseline, monthlySavings * 12);
      debtBaseline = Math.max(0, debtBaseline - debtPaymentYearly);
    }

    // Allocate savings to ISA (capped at £20k) and cash
    const annualSavingsTotal = monthlySavings * 12;
    const isaContribution = Math.min(20000, annualSavingsTotal);
    const cashContribution = Math.max(0, annualSavingsTotal - isaContribution);

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

    // Apply scenario costs: deduct from cash/ISA or add to debt
    let availableSavingsForScenario = Math.max(0, annualSavingsTotal - extraMonthlyCost * 12);
    if (extraLumpSumCost > 0) {
      if (cashScenario >= extraLumpSumCost) {
        cashScenario -= extraLumpSumCost;
      } else {
        const remainingLump = extraLumpSumCost - cashScenario;
        cashScenario = 0;
        if (isaScenario >= remainingLump) {
          isaScenario -= remainingLump;
        } else {
          debtScenario += remainingLump - isaScenario;
          isaScenario = 0;
        }
      }
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

  const tenYearBaseline = trajectory[10]?.baselineNetWorthGbp ?? 0;
  const tenYearScenario = trajectory[10]?.scenarioNetWorthGbp ?? 0;
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
