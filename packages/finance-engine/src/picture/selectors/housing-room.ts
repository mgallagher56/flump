import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { BUDGET_HOUSING_CATEGORY } from "../../budget-entry-names.js";
import type { PortfolioSnapshot } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import type { MissingKey } from "../input.js";
import { budgetRowMonthly, DEBT_CATEGORY, SAVINGS_CATEGORY } from "./budget-totals.js";
import { essentialCommitments } from "./commitments.js";
import type { HousingPayment } from "./housing-cost.js";
import { ESTIMATED_MINIMUMS_NOTE, type SafeToSpend } from "./safe-to-spend.js";
import type { TakeHome } from "./take-home.js";

/**
 * Monthly room before housing (E39 section 4b): take-home pay less essential budget entries
 * outside `"housing"` and debt commitments, with optional switches for planned savings and other
 * spending (MA3), and the current saved housing payment beside it as a fact.
 */
export interface HousingRoom {
  /**
   * Monthly amount left before housing, in pounds. Can be negative when outgoings exceed
   * take-home pay.
   */
  monthly: number;
  takeHomeMonthly: number;
  essentialsWithoutHousing: number;
  debtCommitment: number;
  plannedSavings: number;
  otherSpending: number;
  includeSavings: boolean;
  includeOtherSpending: boolean;
  /** Current saved housing payment at the user's share, or `null` when none is saved. */
  currentHousingMonthly: number | null;
  currentHousingKind: HousingPayment["kind"] | null;
  currentHousingEstimated: boolean;
}

export interface SelectHousingRoomOptions {
  /** Subtract planned savings rows (E39 MA3). Defaults to `false`. */
  includeSavings?: boolean;
  /**
   * Subtract non-essential spending rows outside `"housing"`, `"savings"` and `"debt"` (E39 MA3).
   * Defaults to `false`.
   */
  includeOtherSpending?: boolean;
  /** Optional snapshot to resolve debt account minimums when `picture.safeToSpend` is unknown. */
  snapshot?: PortfolioSnapshot;
}

export interface HousingRoomPictureInput {
  takeHome: Figure<TakeHome>;
  budgetRows: readonly BudgetEntryItem[];
  safeToSpend?: Figure<SafeToSpend>;
  housingPayment?: HousingPayment | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const NOT_SET_LINK_MISSING: Record<"take_home" | "savings" | "debt", MissingKey> = {
  take_home: "annualSalary",
  savings: "linkedAccountMonthly",
  debt: "linkedAccountMonthly",
};

/**
 * Computes the monthly payment the user's saved figures leave room for before housing (E39
 * section 4b). Follows `selectSafeToSpend`: returns `figureUnknown` (never `0`) when take-home
 * pay or essential budget entries are missing or not set.
 */
export function selectHousingRoom(
  picture: HousingRoomPictureInput,
  options: SelectHousingRoomOptions = {},
): Figure<HousingRoom> {
  if (!isFigureKnown(picture.takeHome)) {
    return figureUnknown(
      picture.takeHome.missing,
      picture.takeHome.reason ?? "not-set",
      picture.takeHome.notice,
    );
  }

  const takeHomeMonthly = round2(picture.takeHome.value.monthly);
  if (!(takeHomeMonthly > 0)) {
    return figureUnknown(["annualSalary"], "not-set");
  }

  if (picture.budgetRows.length === 0) {
    return figureUnknown(["budget"], "not-set");
  }

  const notSet = new Set<MissingKey>();
  for (const row of picture.budgetRows) {
    if (row.notSet && row.linked && row.linked !== "housing") {
      notSet.add(NOT_SET_LINK_MISSING[row.linked]);
    }
  }
  if (notSet.size > 0) {
    return figureUnknown([...notSet], "not-set");
  }

  let essentialsWithoutHousing = 0;
  let budgetDebtPayments = 0;
  let plannedSavings = 0;
  let otherSpending = 0;
  let hasEssentials = false;

  for (const row of picture.budgetRows) {
    if (row.isIncome || row.notSet) continue;
    const monthly = budgetRowMonthly(row);
    if (row.category === SAVINGS_CATEGORY) {
      plannedSavings += monthly;
      continue;
    }
    if (row.category === DEBT_CATEGORY) {
      budgetDebtPayments += monthly;
      continue;
    }
    if (row.isEssential && monthly > 0) {
      hasEssentials = true;
    }
    if (row.category === BUDGET_HOUSING_CATEGORY) {
      continue;
    }
    if (row.isEssential) {
      essentialsWithoutHousing += monthly;
    } else {
      otherSpending += monthly;
    }
  }

  if (!hasEssentials) {
    return figureUnknown(["budgetEssentials"], "not-set");
  }

  let debtCommitment = round2(budgetDebtPayments);
  let accountMinimums = 0;
  let minimumsEstimated = false;

  if (options.snapshot) {
    const commitments = essentialCommitments(picture.budgetRows, options.snapshot);
    debtCommitment = commitments.debtCommitment;
    accountMinimums = commitments.accountMinimums;
    minimumsEstimated = commitments.minimumsEstimated;
  } else if (picture.safeToSpend && isFigureKnown(picture.safeToSpend)) {
    const commitments = picture.safeToSpend.value.commitments;
    debtCommitment = commitments.debtCommitment;
    accountMinimums = commitments.accountMinimums;
    minimumsEstimated = commitments.minimumsEstimated;
  }

  const essentialsRounded = round2(essentialsWithoutHousing);
  const savingsRounded = round2(plannedSavings);
  const otherRounded = round2(otherSpending);

  const includeSavings = options.includeSavings === true;
  const includeOtherSpending = options.includeOtherSpending === true;

  let monthly = takeHomeMonthly - essentialsRounded - debtCommitment;
  if (includeSavings) monthly -= savingsRounded;
  if (includeOtherSpending) monthly -= otherRounded;

  const assumptions = [...(picture.takeHome.assumptions ?? [])];
  if (minimumsEstimated && debtCommitment === accountMinimums) {
    assumptions.push(ESTIMATED_MINIMUMS_NOTE);
  }

  const housing = picture.housingPayment ?? null;

  return figureKnown<HousingRoom>(
    {
      monthly: round2(monthly),
      takeHomeMonthly,
      essentialsWithoutHousing: essentialsRounded,
      debtCommitment,
      plannedSavings: savingsRounded,
      otherSpending: otherRounded,
      includeSavings,
      includeOtherSpending,
      currentHousingMonthly: housing ? round2(housing.monthly) : null,
      currentHousingKind: housing ? housing.kind : null,
      currentHousingEstimated: housing ? housing.paymentEstimated : false,
    },
    assumptions.length > 0 ? "assumption" : "derived",
    assumptions,
  );
}
