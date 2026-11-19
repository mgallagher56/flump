import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { isHousingPaymentRow, isTakeHomePayRow } from "../../budget-entry-names.js";
import type { Figure } from "../figure.js";
import { budgetRowMonthly } from "./budget-totals.js";
import type { HousingPayment } from "./housing-cost.js";
import type { TakeHome } from "./take-home.js";

/** Which saved detail a linked row reads. */
export type BudgetRowLink = "take-home" | "housing";

export const LINKED_TAKE_HOME_ID = "linked:take-home";
export const LINKED_HOUSING_ID = "linked:housing";

/** The name a linked housing row shows, by how the person pays for housing. */
const HOUSING_ROW_NAME: Record<HousingPayment["kind"], string> = {
  rent: "Rent",
  mortgage: "Mortgage payment",
  household: "Household contribution",
};

export interface LinkedBudgetRows {
  /** The budget the figures count: saved rows, less the ones a linked row stands in for, plus it. */
  rows: BudgetEntryItem[];
  /** Saved rows a linked row stands in for. Kept in storage, left out of every figure. */
  shadowedRowIds: string[];
}

/**
 * The budget with its linked rows (owner items 7 and 33b). One stored value each, read here:
 *
 * - Take-home pay: worked out from the profile's salary and pension contribution by the take-home
 *   selector. It stands in only while the budget has no take-home pay row of the person's own with
 *   an amount above £0 ("Salary", "Wages" and the other synonyms); a row they typed always wins. A
 *   £0 synonym row is left out, as the linked row stands in for it.
 * - Housing: the rent, mortgage payment or household contribution from the housing details (or the
 *   mortgage accounts' estimate). The person's own saved figure, while above £0, stands in for every
 *   housing row named as the rent or mortgage payment, so the payment is never counted twice. An
 *   estimate stands in only while no such row has an amount above £0: a row they typed wins, and
 *   then no linked housing row is added.
 *
 * Nothing is written: the rows exist only in the figures and on screen.
 */
export function withLinkedBudgetRows(
  budget: readonly BudgetEntryItem[],
  sources: { takeHome: Figure<TakeHome>; housing: HousingPayment | null },
): LinkedBudgetRows {
  const shadowed = new Set<string>();
  let rows: BudgetEntryItem[] = [...budget];
  // No budget yet stays no budget (unknown, never £0): linked rows join a budget once it is started.
  if (budget.length === 0) return { rows, shadowedRowIds: [] };

  const takeHome = sources.takeHome.status === "known" ? sources.takeHome.value.monthly : 0;
  const ownPayRow = budget.some((row) => isTakeHomePayRow(row) && budgetRowMonthly(row) > 0);
  const linkTakeHome = takeHome > 0 && !ownPayRow;
  if (linkTakeHome) {
    for (const row of budget) if (isTakeHomePayRow(row)) shadowed.add(row.id);
  }

  const knownHousing = sources.housing && sources.housing.monthly > 0 ? sources.housing : null;
  // An estimate (from the mortgage accounts) gives way to a housing row the person typed, as
  // take-home does; their own saved rent or housing cost always stands in for the rows.
  const ownHousingRow =
    knownHousing?.paymentEstimated === true &&
    budget.some((row) => isHousingPaymentRow(row) && budgetRowMonthly(row) > 0);
  const housing = ownHousingRow ? null : knownHousing;
  let housingIndex = -1;
  if (housing) {
    housingIndex = budget.findIndex(isHousingPaymentRow);
    for (const row of budget) if (isHousingPaymentRow(row)) shadowed.add(row.id);
  }

  if (shadowed.size > 0 || linkTakeHome || housing) {
    const housingRow: BudgetEntryItem | null = housing
      ? {
          id: LINKED_HOUSING_ID,
          category: "housing",
          name: HOUSING_ROW_NAME[housing.kind],
          amount: housing.monthly,
          frequency: "monthly",
          isIncome: false,
          isEssential: true,
          ownership: "sole",
          sharePercent: null,
          linked: "housing",
        }
      : null;
    const next: BudgetEntryItem[] = [];
    if (linkTakeHome) {
      next.push({
        id: LINKED_TAKE_HOME_ID,
        category: "income",
        name: "Take-home pay",
        amount: takeHome,
        frequency: "monthly",
        isIncome: true,
        isEssential: true,
        ownership: "sole",
        sharePercent: null,
        linked: "take-home",
      });
    }
    budget.forEach((row, index) => {
      if (housingRow && index === housingIndex) next.push(housingRow);
      if (!shadowed.has(row.id)) next.push(row);
    });
    if (housingRow && housingIndex < 0) next.push(housingRow);
    rows = next;
  }

  return { rows, shadowedRowIds: [...shadowed] };
}
