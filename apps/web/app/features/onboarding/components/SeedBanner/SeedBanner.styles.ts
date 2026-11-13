import { sva } from "@repo/ui/styled-system/css";

export const seedBannerRecipe = sva({
  slots: ["root", "message", "icon", "figure", "actions"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "3",
      padding: "4",
      borderRadius: "xl",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "status.positive.border",
      backgroundColor: "status.positive.bg",
      color: "status.positive.text",
    },
    message: {
      display: "flex",
      alignItems: "flex-start",
      gap: "2",
      textStyle: "label.md",
      fontWeight: "semibold",
    },
    icon: { display: "inline-flex", flexShrink: 0, mt: "0.5" },
    figure: { fontVariantNumeric: "tabular-nums" },
    actions: { display: "flex", flexWrap: "wrap", gap: "2" },
  },
});
