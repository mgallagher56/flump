import { sva } from "@repo/ui/styled-system/css";

export const incomeStepRecipe = sva({
  slots: ["pair", "presets", "presetLabel", "presetButton"],
  base: {
    pair: { display: "grid", gap: "4", gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" } },
    presets: {
      display: "flex",
      flexWrap: "wrap",
      gap: "2",
      alignItems: "center",
      border: "none",
      margin: 0,
      padding: 0,
      minWidth: 0,
    },
    presetLabel: { textStyle: "body.sm", color: "text.secondary", float: "left", marginRight: "2" },
    presetButton: { fontVariantNumeric: "tabular-nums" },
  },
});
