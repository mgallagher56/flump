import { sva } from "@repo/ui/styled-system/css";

export const housingDetails = sva({
  slots: ["header", "title", "list", "row", "label", "value", "unset", "form", "note"],
  base: {
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "3",
      flexWrap: "wrap",
      mb: "3",
    },
    title: { margin: "0", textStyle: "heading.sm", color: "text.primary" },
    list: { margin: "0" },
    row: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: "3",
      py: "2",
      textStyle: "body.md",
      color: "text.primary",
    },
    label: { margin: "0", color: "text.secondary" },
    value: {
      margin: "0",
      fontVariantNumeric: "tabular-nums",
      fontWeight: "semibold",
      color: "text.primary",
    },
    unset: { margin: "0", textStyle: "body.md", color: "text.muted" },
    form: { display: "flex", flexDirection: "column", gap: "4" },
    note: { margin: "0", textStyle: "body.sm", color: "text.secondary" },
  },
});
