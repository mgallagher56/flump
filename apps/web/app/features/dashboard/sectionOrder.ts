import type { DashboardWidgetKey } from "~/utils/pageConfig";

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
 * The cards the dashboard draws: all `available` (ticked sections that have something to show)
 * in the section order, or the first `max` if a limit is supplied.
 */
export const selectSectionCards = (
  available: readonly DashboardWidgetKey[],
  max?: number,
): DashboardWidgetKey[] => {
  const ordered = orderSections(available);
  return max === undefined ? ordered : ordered.slice(0, max);
};
