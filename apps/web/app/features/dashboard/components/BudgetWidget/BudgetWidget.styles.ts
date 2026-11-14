import { cva } from "@repo/ui/styled-system/css";

/**
 * The card itself is drawn by `WidgetCard`. `formatMonthsOfCover` text, exported from here for the
 * KPI strip and the budget page, is always shown in tabular figures: use this recipe when a
 * surface has no numeric text style of its own.
 */
export const monthsOfCoverText = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
