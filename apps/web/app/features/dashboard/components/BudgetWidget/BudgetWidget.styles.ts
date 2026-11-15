import { cva } from "@repo/ui/styled-system/css";

/**
 * The card itself is drawn by `WidgetCard`. The breathing room phrase in the card's line is shown in
 * tabular figures.
 */
export const monthsOfCoverText = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
