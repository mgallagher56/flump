import { calculateUkTax, type UkStudentLoanPlan } from "@flump/finance-engine";
import type { OnboardingValues } from "./types";

export interface OnboardingSummary {
  hasIncome: boolean;
  canFinish: boolean;
  /** Plain words for what stops Finish, or null when nothing does. */
  missingForFinish: string | null;
  missingIncome: boolean;
  missingRegion: boolean;
  monthlyTakeHome: number;
  annualTakeHome: number;
  monthlyHousing: number;
  otherOutgoings: number;
  monthlySurplus: number;
  homeEquity: number;
  startingNetWorth: number;
  /** False until at least one balance or property figure has been given. */
  hasNetWorthInputs: boolean;
}

/** Live figures for the summary bar and the review. Empty fields count as 0 here, never when saved. */
export function deriveOnboardingSummary(values: OnboardingValues): OnboardingSummary {
  const salary = values.grossSalary ?? 0;
  const takeHomeNet = values.monthlyTakeHome ?? 0;
  const hasIncome = values.incomeMode === "gross" ? salary > 0 : takeHomeNet > 0;
  const missingRegion = values.taxRegion === null;
  const canFinish = hasIncome && !missingRegion;
  const missingForFinish = canFinish
    ? null
    : !hasIncome
      ? missingRegion
        ? "Enter your income and choose where you pay tax"
        : "Enter your income"
      : "Choose where you pay tax";

  let monthlyTakeHome: number;
  let annualTakeHome: number;
  if (values.incomeMode === "net") {
    monthlyTakeHome = takeHomeNet;
    annualTakeHome = takeHomeNet * 12;
  } else {
    const tax = calculateUkTax({
      grossSalary: salary,
      pensionContributionPct: values.pensionPercent ?? 0,
      isSalarySacrifice: values.isSalarySacrifice ?? false,
      studentLoanPlan: values.studentLoanPlan as UkStudentLoanPlan,
      region: values.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES",
    });
    monthlyTakeHome = Math.round(tax.netTakeHomePayMonthlyGbp);
    annualTakeHome = Math.round(tax.netTakeHomePayAnnualGbp);
  }

  const monthlyHousing =
    values.housingStatus === "own_outright" ? 0 : (values.monthlyHousingCost ?? 0);
  const otherOutgoings = values.monthlyOtherOutgoings ?? 0;
  const homeEquity =
    values.housingStatus === "renting"
      ? 0
      : Math.max(0, (values.propertyValue ?? 0) - (values.mortgageBalance ?? 0));
  const startingNetWorth =
    (values.cashSavings ?? 0) + (values.pensionPot ?? 0) + homeEquity - (values.unsecuredDebt ?? 0);

  return {
    hasIncome,
    canFinish,
    missingForFinish,
    missingIncome: !hasIncome,
    missingRegion,
    monthlyTakeHome,
    annualTakeHome,
    monthlyHousing,
    otherOutgoings,
    monthlySurplus: monthlyTakeHome - monthlyHousing - otherOutgoings,
    homeEquity,
    startingNetWorth,
    hasNetWorthInputs: [
      values.cashSavings,
      values.pensionPot,
      values.propertyValue,
      values.unsecuredDebt,
    ].some((v) => v !== null),
  };
}
