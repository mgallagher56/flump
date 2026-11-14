import { cva } from "@repo/ui/styled-system/css";

/**
 * "Show data" and the page's quiet links on one row. The drawer and the links share the first grid
 * cell: the drawer spans the row (its table opens full width below its trigger) and the links sit
 * at the end of the trigger's line. Only the drawer's public `className` is used, never its DOM.
 */
export const dataRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    alignItems: "start",
    rowGap: "1",
    minWidth: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

/** The quiet drawer: the whole first cell, so its table is full width. */
export const dataRowDrawer = cva({
  base: { gridColumn: "1", gridRow: "1", minWidth: 0 },
});

/**
 * The page's links. With a drawer they sit at the end of its trigger's line (same cell, aligned to
 * the end, a touch target tall); without one they lead the row.
 */
export const dataRowEnd = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "6",
    rowGap: "1",
    minHeight: "touch",
    minWidth: 0,
  },
  variants: {
    besideDrawer: {
      true: { gridColumn: "1", gridRow: "1", justifySelf: "end", justifyContent: "flex-end" },
      false: { justifyContent: "flex-start" },
    },
  },
  defaultVariants: { besideDrawer: false },
});

/** Quiet text on its own line under the row ("Next check-in: 1 December 2026"). */
export const dataRowNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});
