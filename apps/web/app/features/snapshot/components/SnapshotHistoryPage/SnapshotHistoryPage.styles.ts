import { cva } from "@repo/ui/styled-system/css";

// Gutters and the page width come from `PageBody`, so the page matches every other page.

/** The chart, its summary and data row: every figure and date in tabular numbers. */
export const sectionStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/** The quiet drawer holding the change by account. */
export const changesBody = cva({
  base: { minWidth: 0 },
});

/** The link button's own inline padding, taken back so it lines up with "Show data". */
export const flushLink = cva({
  base: { marginInline: "-1" },
});
