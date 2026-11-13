import { sva } from "@repo/ui/styled-system/css";

export const liveSummaryRecipe = sva({
  slots: ["cell", "label", "figure", "note"],
  base: {
    cell: {
      display: "flex",
      flexDirection: "column",
      gap: "1",
      padding: "3",
      borderRadius: "xl",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "border.subtle",
      backgroundColor: "surface.card",
      minWidth: 0,
    },
    label: { textStyle: "label.sm", color: "text.secondary" },
    figure: { textStyle: "numeric.md", fontVariantNumeric: "tabular-nums", color: "text.primary" },
    note: { textStyle: "body.sm", color: "text.secondary" },
  },
  variants: {
    tone: {
      neutral: {},
      unset: { figure: { color: "text.muted", fontWeight: "normal" } },
    },
  },
  defaultVariants: { tone: "neutral" },
});
