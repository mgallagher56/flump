import type { DashboardWidgetKey } from "~/utils/pageConfig";

/** At most four section cards render (plan D1, E16 P1.8). */
export const MAX_SECTION_CARDS = 4;

/**
 * The one dashboard section order, first to last, used by the cards and by "Choose what shows
 * here". Debt, mortgage, savings and pension show figures found nowhere else on the page; budget
 * and accounts mostly repeat the hero and the KPI strip, so they come last.
 */
export const SECTION_PRIORITY: readonly DashboardWidgetKey[] = [
  "debt",
  "mortgage",
  "savings",
  "pension",
  "tax",
  "budget",
  "accounts",
];

/** `keys` in the dashboard's section order. */
export const orderSections = (keys: readonly DashboardWidgetKey[]): DashboardWidgetKey[] =>
  SECTION_PRIORITY.filter((k) => keys.includes(k));

/**
 * The cards the dashboard draws: the first `max` of `available` (ticked sections that have
 * something to show) in the section order. The panel's "Showing" reads this same list.
 */
export const selectSectionCards = (
  available: readonly DashboardWidgetKey[],
  max = MAX_SECTION_CARDS,
): DashboardWidgetKey[] => orderSections(available).slice(0, max);
