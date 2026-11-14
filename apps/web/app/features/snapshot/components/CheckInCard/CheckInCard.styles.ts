import { cva } from "@repo/ui/styled-system/css";

export const cardRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

/** "3 of 8": text alone, no bar. */
export const progress = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

/**
 * The account on the sheet's own surface: no bordered card nested inside the sheet. One height for
 * every account, open or done, so the sheet does not jump between steps at 375. Taller steps (a
 * calculated figure with a statement prompt) still grow.
 */
export const cardSurface = cva({
  base: { minHeight: "15rem" },
});

/**
 * Back (and Next) at the start, "No change to the rest" at the end: one row of quiet buttons. Holds
 * a button's height when none shows, so the sheet keeps its height.
 */
export const cardNav = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "2",
    minHeight: "density.control.md",
    "@media (pointer: coarse)": { minHeight: "touch" },
  },
});

export const cardNavGroup = cva({
  base: { display: "flex", alignItems: "center", gap: "2" },
});
