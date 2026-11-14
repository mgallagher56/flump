import { cva } from "@repo/ui/styled-system/css";

// Gutters and the page width come from `PageBody`, so the page matches every other page.

export const actionsRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px" },
});

export const sectionStack = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

/** The check-in button under the "chart appears after your third check-in" prompt. */
export const promptActions = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px" },
});

export const checkInLine = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});
