import { sva } from "@repo/ui/styled-system/css";

export const incomeStepRecipe = sva({
  slots: ["pair", "presets", "presetLabel", "presetButton"],
  base: {
    pair: { display: "grid", gap: "4", gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" } },
    // The three example salaries share one even row at every width, under their label (P58).
    presets: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "2",
      alignItems: "center",
      border: "none",
      margin: 0,
      padding: 0,
      minWidth: 0,
    },
    // Floated, a legend lays out like any grid item, so it can take the whole first row.
    presetLabel: {
      textStyle: "body.sm",
      color: "text.secondary",
      float: "left",
      gridColumn: "1 / -1",
    },
    presetButton: {
      fontVariantNumeric: "tabular-nums",
      width: "100%",
      minWidth: 0,
      paddingX: "2",
      whiteSpace: "nowrap",
    },
  },
});
