import {
  isFigureKnown,
  type ProfileFacts,
  selectTakeHome,
  studentLoanThresholdNotPublishedNotice,
} from "@flump/finance-engine";
import { type OnboardingValues, ownsHome } from "./types";

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/**
 * The facts onboarding has so far, as the engine reads a saved profile. Unanswered pension and
 * salary sacrifice count as none (0% and net pay) for the live figure only, and the note under it
 * says so (`takeHomeIncludesNote`); a blank pension is never saved. Region stays null so the
 * engine names its assumption.
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

/** Under the live take-home while the pension field is blank: it is worked out with none. */
const BEFORE_PENSION_NOTE = "Before any pension contribution";

/**
 * One sentence naming the deductions the take-home includes, or null when there are none. While
 * the pension is blank the figure has no pension in it, so the note says so plainly: the Dashboard
 * shows take-home as not set until a rate is saved.
 */
function takeHomeIncludesNote(values: OnboardingValues): string | null {
  const pension = (values.pensionPercent ?? 0) > 0;
  const loan = values.studentLoanPlan !== "NONE";
  if (values.pensionPercent === null) {
    return loan ? `Now includes your student loan. ${BEFORE_PENSION_NOTE}` : BEFORE_PENSION_NOTE;
  }
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
  /**
   * The one line shown in place of the take-home when the year's rates for this person are not
   * published (Scottish 2027/28), or null. The figure is then not available, never £0.
   */
  takeHomeRefusal: string | null;
  /** True in take-home mode: the figure is the one typed, not an estimate. */
  takeHomeTyped: boolean;
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
  let takeHomeRefusal: string | null = null;
  if (values.incomeMode === "net") {
    monthlyTakeHome = takeHomeNet;
    annualTakeHome = takeHomeNet * 12;
  } else {
    const takeHome = selectTakeHome(onboardingTakeHomeFacts(values));
    if (isFigureKnown(takeHome)) {
      monthlyTakeHome = takeHome.value.monthly;
      annualTakeHome = takeHome.value.annual;
      // A plan with no published threshold for the year is left out of the figure, so the note
      // says so instead of "Now includes your student loan".
      const year = takeHome.value.taxYear;
      const loanNotice = year ? studentLoanThresholdNotPublishedNotice(year) : null;
      if (loanNotice && takeHome.assumptions?.includes(loanNotice)) {
        const includes = takeHomeIncludesNote({ ...values, studentLoanPlan: "NONE" });
        takeHomeNote = includes ? `${includes}. ${loanNotice}` : loanNotice;
      } else {
        takeHomeNote = takeHomeIncludesNote(values);
      }
    } else if (takeHome.reason === "rates-not-published") {
      takeHomeRefusal = takeHome.notice ?? null;
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
    takeHomeRefusal,
    takeHomeTyped: values.incomeMode === "net",
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
