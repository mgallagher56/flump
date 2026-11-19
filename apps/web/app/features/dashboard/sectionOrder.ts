import type { DashboardWidgetKey } from "~/utils/pageConfig";

/**
 * The default dashboard section order, first to last, used by the cards and by "Choose what shows
 * here" until the user moves a section. Debt, mortgage, savings and pension show figures found
 * nowhere else on the page; budget and accounts mostly repeat the hero and the KPI strip, so they
 * come last.
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

/**
 * The full section order from the saved `dashboardWidgetOrder`: the saved sections first, in the
 * saved order, then every section it does not name (a new one, or one never moved) in the default
 * order. Unknown, retired and repeated keys are dropped. Nothing saved means the default order.
 */
export const resolveSectionOrder = (
  saved: readonly string[] | null | undefined,
): DashboardWidgetKey[] => {
  const known = new Set<string>(SECTION_PRIORITY);
  const head: DashboardWidgetKey[] = [];
  for (const key of saved ?? []) {
    if (known.has(key) && !head.includes(key as DashboardWidgetKey)) {
      head.push(key as DashboardWidgetKey);
    }
  }
  return [...head, ...SECTION_PRIORITY.filter((k) => !head.includes(k))];
};

/** Whether `order` is the default order. */
export const isDefaultSectionOrder = (order: readonly DashboardWidgetKey[]): boolean =>
  resolveSectionOrder(order).every((key, i) => key === SECTION_PRIORITY[i]);

/** `order` with `key` moved `offset` places (-1 up, 1 down). At either end it is unchanged. */
export const moveSection = (
  order: readonly DashboardWidgetKey[],
  key: DashboardWidgetKey,
  offset: -1 | 1,
): DashboardWidgetKey[] => {
  const next = [...order];
  const from = next.indexOf(key);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= next.length) return next;
  next[from] = next[to] as DashboardWidgetKey;
  next[to] = key;
  return next;
};

/** `keys` in the section order (the default order unless one is given). */
export const orderSections = (
  keys: readonly DashboardWidgetKey[],
  order: readonly DashboardWidgetKey[] = SECTION_PRIORITY,
): DashboardWidgetKey[] => order.filter((k) => keys.includes(k));

/**
 * The cards the dashboard draws: all `available` (ticked sections that have something to show)
 * in the section order, or the first `max` if a limit is supplied.
 */
export const selectSectionCards = (
  available: readonly DashboardWidgetKey[],
  order: readonly DashboardWidgetKey[] = SECTION_PRIORITY,
  max?: number,
): DashboardWidgetKey[] => {
  const ordered = orderSections(available, order);
  return max === undefined ? ordered : ordered.slice(0, max);
};
