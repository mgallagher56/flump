import type { BudgetEntryItem } from "../ai-context-pack.js";
import type { PortfolioSnapshot, RawAccount } from "../portfolio.js";
import type { UkTaxYear } from "../types.js";
import type { Figure } from "./figure.js";
import type { ProfileFacts } from "./input.js";
import { type BudgetTotals, selectBudgetTotals } from "./selectors/budget-totals.js";
import { type HousingPayment, selectHousingPayment } from "./selectors/housing-cost.js";
import { type LinkedBudgetRows, withLinkedBudgetRows } from "./selectors/linked-budget-rows.js";
import { selectTakeHome, type TakeHome, takeHomeLeavesOut } from "./selectors/take-home.js";

/** The take-home, the housing payment, the budget with its linked lines, and its totals. */
export interface BudgetFigures {
  takeHome: Figure<TakeHome>;
  housingPayment: HousingPayment | null;
  linked: LinkedBudgetRows;
  budget: Figure<BudgetTotals>;
}

/**
 * The budget's figures from saved facts and rows: the one assembly `buildFinancialPicture` and the
 * mobile app's strip (`selectHomeStripFromRows`) share, so both count the same lines (E12 S5b).
 */
export function selectBudgetFigures(
  input: { profile: ProfileFacts; accounts: RawAccount[]; budget: BudgetEntryItem[] },
  snapshot: PortfolioSnapshot,
  opts: { taxYear?: UkTaxYear } = {},
): BudgetFigures {
  const takeHome = selectTakeHome(input.profile, { taxYear: opts.taxYear });
  const housingPayment = selectHousingPayment(
    input.profile,
    snapshot,
    input.accounts,
    input.budget,
  );
  const linked = withLinkedBudgetRows(input.budget, {
    takeHome,
    housing: housingPayment,
    accounts: snapshot,
  });
  return {
    takeHome,
    housingPayment,
    linked,
    budget: selectBudgetTotals(linked.rows, takeHomeLeavesOut(takeHome)),
  };
}
