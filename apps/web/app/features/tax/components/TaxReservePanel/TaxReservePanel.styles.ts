import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", minWidth: 0 },
});

export const twoUp = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" },
    gap: "5",
    alignItems: "start",
  },
});

export const paramsAndBreakdown = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 3fr)" },
    gap: "5",
    alignItems: "start",
  },
});

export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const cardTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const cardIntro = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});

export const saveRow = cva({
  base: { display: "flex", justifyContent: "flex-end" },
});

export const list = cva({
  base: { display: "flex", flexDirection: "column", margin: 0 },
});

export const row = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "4",
    py: "2",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    "& dt": { color: "text.secondary" },
    "& dd": { margin: 0, color: "text.primary", fontWeight: "medium", textAlign: "right" },
  },
  variants: {
    emphasis: {
      none: {},
      subtotal: { "& dt, & dd": { color: "text.primary", fontWeight: "semibold" } },
      total: {
        borderBottomWidth: "0",
        borderTopWidth: "2px",
        borderTopStyle: "solid",
        borderTopColor: "border",
        pt: "3",
        "& dt, & dd": { color: "text.primary", fontWeight: "bold", textStyle: "body.md" },
      },
    },
  },
  defaultVariants: { emphasis: "none" },
});
