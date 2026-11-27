/**
 * Home's two-figure strip on its own (`@flump/finance-engine/home-strip`), for the mobile app
 * (E12 S5b). Metro does not drop unused exports, so importing the package root bundles all of it,
 * including the tax vector catalogue. This entry reaches the take-home core but not the vector
 * sign-off (`tax-year-verification.ts`) or the debt payoff schedule; `home-strip-entry.test.ts`
 * keeps them out. `selectHomeStripFromRows` takes the API rows and does every sum.
 */

export {
  budgetCountsWorkedOutTakeHome,
  budgetHasSpending,
  budgetLeavesOut,
  budgetRefusalNotice,
  budgetSurplusOrNull,
  type HomeStrip,
  type HomeStripBudget,
  type HomeStripFacts,
  type HomeStripFirstCell,
  type HomeStripRows,
  type HomeStripSecondCell,
  homeStripBudget,
  selectHomeStrip,
  selectHomeStripFromRows,
} from "./home-strip.js";
export { type BudgetFigures, selectBudgetFigures } from "./picture/budget-figures.js";
export { type BudgetRowLike, budgetEntryFromRow } from "./picture/budget-rows.js";
export type { Figure } from "./picture/figure.js";
export { type ProfileFacts, profileFactsFromProfile } from "./picture/input.js";
export { type BudgetTotals, selectBudgetTotals } from "./picture/selectors/budget-totals.js";
export {
  type LinkedBudgetRows,
  withLinkedBudgetRows,
} from "./picture/selectors/linked-budget-rows.js";
export { selectConsumerDebtTotal } from "./picture/selectors/portfolio-totals.js";
export { selectTakeHome, type TakeHome } from "./picture/selectors/take-home.js";
export { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "./portfolio.js";
export { getUkTaxYearContext, type UkTaxYearContext } from "./uk-tax-year-calendar.js";
