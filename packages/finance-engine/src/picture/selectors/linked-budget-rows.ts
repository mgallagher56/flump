import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { BUDGET_HOUSING_CATEGORY } from "../../budget-entry-names.js";
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

/**
 * A link the person can choose to make. Nothing changes until they do: choosing a row stores
 * `linksTo` on it with its amount set to £0, so the saved detail is the one stored value.
 */
export interface BudgetLinkOffer {
  link: BudgetRowLink;
  /** The saved figure the row would read, pounds a month. */
  monthly: number;
  /** For housing: rent, mortgage payment or household contribution. Null for take-home. */
  kind: HousingPayment["kind"] | null;
  /** The saved rows the person can pick from, in budget order. */
  rowIds: string[];
}

export interface LinkedBudgetRows {
  /** The budget the figures count: saved rows, less the ones a linked row stands in for, plus it. */
  rows: BudgetEntryItem[];
  /** Saved rows a linked row stands in for. Kept in storage, left out of every figure. */
  shadowedRowIds: string[];
  /** Links the budget page offers as an action instead of making them itself. */
  offers: BudgetLinkOffer[];
}

const isIncomeRow = (row: BudgetEntryItem): boolean => row.isIncome === true;

/** A spending row in the housing category. Names are never read. */
const isHousingRow = (row: BudgetEntryItem): boolean =>
  row.isIncome !== true && row.category === BUDGET_HOUSING_CATEGORY;

/**
 * The budget with its linked rows (owner items 7 and 33b). One stored value each, read here. No
 * row name is read for any of these money decisions: a name decides nothing.
 *
 * Take-home pay (worked out from the profile's salary by the take-home selector):
 * - A row the person replaced with it (`linksTo: "take-home"`) reads it in that row's place.
 * - Otherwise, while the budget has any income row with an amount above £0, nothing is added or
 *   hidden: the person's own rows are their income, and the link is only offered.
 * - Otherwise (no income rows, or only £0 ones) the take-home row is added. £0 rows stay listed.
 *
 * Housing (the saved rent, mortgage payment or household contribution, or the mortgage
 * accounts' estimate), by category: every spending row in "housing" is a payment row.
 * - A row the person replaced with it (`linksTo: "housing"`) reads it in that row's place.
 * - An estimate gives way to any housing row with an amount above £0: nothing is added.
 * - No housing rows: the housing row is added.
 * - Exactly one housing row: the linked figure stands in for it.
 * - More than one: nothing changes, and the link is offered.
 *
 * A linked row standing in for a saved row keeps that row's ownership and share, unless the
 * figure is already the person's share (the mortgage accounts' estimate, from share-scaled
 * balances), so a shared row is never replaced by a whole amount. Nothing is written: the rows exist only in the figures and on screen.
 */
export function withLinkedBudgetRows(
  budget: readonly BudgetEntryItem[],
  sources: { takeHome: Figure<TakeHome>; housing: HousingPayment | null },
): LinkedBudgetRows {
  // No budget yet stays no budget (unknown, never £0): linked rows join a budget once it is started.
  if (budget.length === 0) return { rows: [...budget], shadowedRowIds: [], offers: [] };

  const offers: BudgetLinkOffer[] = [];
  const replaced = new Map<string, BudgetEntryItem>();
  let addTakeHome: BudgetEntryItem | null = null;
  let addHousing: BudgetEntryItem | null = null;

  // Take-home pay.
  const takeHome = sources.takeHome.status === "known" ? sources.takeHome.value.monthly : 0;
  if (takeHome > 0) {
    const base: BudgetEntryItem = {
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
    };
    const chosen = budget.find((row) => isIncomeRow(row) && row.linksTo === "take-home");
    const ownIncome = budget.filter((row) => isIncomeRow(row) && budgetRowMonthly(row) > 0);
    if (chosen) {
      replaced.set(chosen.id, {
        ...base,
        ownership: chosen.ownership ?? "sole",
        sharePercent: chosen.sharePercent ?? null,
      });
    } else if (ownIncome.length > 0) {
      offers.push({
        link: "take-home",
        monthly: takeHome,
        kind: null,
        rowIds: ownIncome.map((row) => row.id),
      });
    } else {
      addTakeHome = base;
    }
  }

  // Housing.
  const housing = sources.housing && sources.housing.monthly > 0 ? sources.housing : null;
  if (housing) {
    const base: BudgetEntryItem = {
      id: LINKED_HOUSING_ID,
      category: BUDGET_HOUSING_CATEGORY,
      name: HOUSING_ROW_NAME[housing.kind],
      amount: housing.monthly,
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
      ownership: "sole",
      sharePercent: null,
      linked: "housing",
    };
    // The saved amount carries no share, so it takes the replaced row's; the estimate is already
    // the person's share, so it counts as it is.
    const standIn = (row: BudgetEntryItem): BudgetEntryItem =>
      housing.isOwnShare === true
        ? base
        : { ...base, ownership: row.ownership ?? "sole", sharePercent: row.sharePercent ?? null };
    const housingRows = budget.filter(isHousingRow);
    const chosen = housingRows.find((row) => row.linksTo === "housing");
    const typed = housingRows.some((row) => budgetRowMonthly(row) > 0);
    if (chosen) {
      replaced.set(chosen.id, standIn(chosen));
    } else if (housing.paymentEstimated && typed) {
      // The person's own figure wins over an estimate; nothing to add or offer.
    } else if (housingRows.length === 0) {
      addHousing = base;
    } else if (housingRows.length === 1) {
      const only = housingRows[0] as BudgetEntryItem;
      replaced.set(only.id, standIn(only));
    } else if (!housing.paymentEstimated) {
      offers.push({
        link: "housing",
        monthly: housing.monthly,
        kind: housing.kind,
        rowIds: housingRows.map((row) => row.id),
      });
    }
  }

  if (replaced.size === 0 && !addTakeHome && !addHousing) {
    return { rows: [...budget], shadowedRowIds: [], offers };
  }
  const rows: BudgetEntryItem[] = addTakeHome ? [addTakeHome] : [];
  for (const row of budget) rows.push(replaced.get(row.id) ?? row);
  if (addHousing) rows.push(addHousing);
  return { rows, shadowedRowIds: [...replaced.keys()], offers };
}
