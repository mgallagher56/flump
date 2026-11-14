import { isFigureKnown, type ProfileFacts, selectTakeHome } from "@flump/finance-engine";
import { type OnboardingValues, ownsHome } from "./types";

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/**
 * The facts onboarding has so far, as the engine reads a saved profile. Unanswered pension and
 * salary sacrifice count as none (0% and net pay) for the live figure only; region stays null so
 * the engine names its assumption.
 */
export function onboardingTakeHomeFacts(values: OnboardingValues): ProfileFacts {
  const salary = values.grossSalary ?? 0;
  return {
    annualSalary: salary > 0 ? salary : null,
    employmentType: values.employmentType,
    taxRegion: values.taxRegion,
    studentLoanPlans: values.studentLoanPlan === "NONE" ? [] : [values.studentLoanPlan],
    pensionPercent: values.pensionPercent ?? 0,
    isSalarySacrifice: values.isSalarySacrifice ?? false,
  };
}

/** One sentence naming the deductions the take-home includes, or null when there are none. */
export function takeHomeIncludesNote(values: OnboardingValues): string | null {
  const pension = (values.pensionPercent ?? 0) > 0;
  const loan = values.studentLoanPlan !== "NONE";
  if (!pension && !loan) return null;
  const pensionPart = `your ${percentFormat.format(values.pensionPercent ?? 0)}% pension`;
  if (pension && loan) return `Now includes ${pensionPart} and student loan`;
  return pension ? `Now includes ${pensionPart}` : "Now includes your student loan";
}

export interface OnboardingSummary {
  hasIncome: boolean;
  canFinish: boolean;
  /** Plain words for what stops Finish, or null when nothing does. */
  missingForFinish: string | null;
  missingIncome: boolean;
  missingRegion: boolean;
  monthlyTakeHome: number;
  annualTakeHome: number;
  /**
   * Why the take-home moved as answers came in ("Now includes your 5% pension and student
   * loan"), or null when no pension or student loan is in it, or in net mode.
   */
  takeHomeNote: string | null;
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

  // Gross mode uses the engine's one take-home selector, the same one the dashboard, budget and
  // take-home pages read, so the figure here is the figure the user sees after finishing.
  let monthlyTakeHome = 0;
  let annualTakeHome = 0;
  let takeHomeNote: string | null = null;
  if (values.incomeMode === "net") {
    monthlyTakeHome = takeHomeNet;
    annualTakeHome = takeHomeNet * 12;
  } else {
    const takeHome = selectTakeHome(onboardingTakeHomeFacts(values));
    if (isFigureKnown(takeHome)) {
      monthlyTakeHome = takeHome.value.monthly;
      annualTakeHome = takeHome.value.annual;
      takeHomeNote = takeHomeIncludesNote(values);
    }
  }

  // Own with no mortgage, or not answered, has no housing payment. Living with family or
  // friends counts what the person pays, which is optional, so empty is £0.
  const paysForHousing =
    values.housingStatus === "renting" ||
    values.housingStatus === "mortgage" ||
    values.housingStatus === "living_with_family";
  const monthlyHousing = paysForHousing ? (values.monthlyHousingCost ?? 0) : 0;
  const otherOutgoings = values.monthlyOtherOutgoings ?? 0;
  const homeEquity = ownsHome(values.housingStatus)
    ? Math.max(0, (values.propertyValue ?? 0) - (values.mortgageBalance ?? 0))
    : 0;
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
    takeHomeNote,
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
