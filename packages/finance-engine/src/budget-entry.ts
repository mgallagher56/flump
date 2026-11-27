/**
 * The Budget page on its own (`@flump/finance-engine/budget`), for the mobile app (E12 S10).
 * Metro does not drop unused exports, so importing the package root bundles all of it, including
 * the tax vector catalogue. This entry reaches the take-home core but not the vector sign-off
 * (`tax-year-verification.ts`) or the debt payoff schedule; `budget-entry.test.ts` keeps them
 * out. `selectBudgetPageFromRows` takes the API rows and does every sum.
 */

export {
  type BreathingRoomWording,
  breathingRoomPhrase,
  breathingRoomValue,
  describeBreathingRoom,
  formatBreathingRoomFigure,
} from "./breathing-room-wording.js";
export {
  type BreathingRoomBasisFacts,
  type BreathingRoomFixedReason,
  type BudgetCategoryEntryFigure,
  type BudgetCategoryRank,
  type BudgetLinkableAccount,
  type BudgetOverviewFacts,
  type BudgetOverviewPrompt,
  type BudgetOverviewSubline,
  type BudgetPage,
  type BudgetPageAccount,
  type BudgetPageEntry,
  type BudgetPageFigures,
  type BudgetPageRows,
  type BudgetPageSavedRow,
  breathingRoomFixedReason,
  budgetCategoryEntries,
  budgetEntryShownMonthly,
  budgetPageCategories,
  clampRunwayCut,
  clampRunwayLump,
  INCOME_CATEGORY,
  isIncomeCategory,
  isIncomeEntry,
  type LinkedBudgetPageRow,
  type LinkedBudgetSource,
  linkedAccountFor,
  linkedBudgetSource,
  pageBudgetRows,
  RUNWAY_LUMP_MAX,
  type RunwayIllustration,
  type RunwayScenarioInputs,
  type RunwaySetup,
  rankBudgetCategories,
  runwayIllustration,
  runwaySetup,
  STANDARD_BUDGET_CATEGORIES,
  selectBreathingRoomBasis,
  selectBudgetOverview,
  selectBudgetPage,
  selectBudgetPageFromRows,
  selectRunwayIllustration,
} from "./budget-page.js";
export { type BudgetRowLike, budgetEntryFromRow } from "./picture/budget-rows.js";
export { type Figure, isFigureKnown } from "./picture/figure.js";
export { type BudgetTotals, budgetRowMonthly } from "./picture/selectors/budget-totals.js";
export {
  type MonthsOfCover,
  monthsOfCoverFor,
  selectMonthsOfCover,
} from "./picture/selectors/months-of-cover.js";
export { type SafeToSpend, selectSafeToSpend } from "./picture/selectors/safe-to-spend.js";
export { selectTakeHome, type TakeHome } from "./picture/selectors/take-home.js";
export { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "./portfolio.js";
export { getUkTaxYearContext, type UkTaxYearContext } from "./uk-tax-year-calendar.js";
