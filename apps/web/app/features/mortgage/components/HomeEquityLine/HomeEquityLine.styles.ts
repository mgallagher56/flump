import { sva } from "@repo/ui/styled-system/css";

/** A plain read-only line: label on the left, the figure beside it, an optional share subline. */
export const homeEquityLineRecipe = sva({
  slots: ["root", "row", "label", "value", "subline"],
  base: {
    root: { display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0 },
    row: {
      display: "flex",
      alignItems: "baseline",
      gap: "2",
      flexWrap: "wrap",
    },
    label: { textStyle: "body.sm", color: "text.secondary" },
    value: { color: "text.primary", fontVariantNumeric: "tabular-nums" },
    subline: {
      textStyle: "label.sm",
      color: "text.muted",
      fontVariantNumeric: "tabular-nums",
      margin: 0,
    },
  },
});
