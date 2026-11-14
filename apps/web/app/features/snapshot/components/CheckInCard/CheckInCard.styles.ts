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
 * The whole step body: the account and its row of Back / "No change to the rest" buttons. One
 * height for every account, open or done, so the sheet does not jump between steps at 375. The
 * buttons sit straight under the account, so any spare height falls below them, never between the
 * account and its buttons. Taller steps (a calculated figure with a statement prompt) still grow.
 */
export const cardBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minHeight: "19rem", minWidth: 0 },
});

/** The account on the sheet's own surface: no bordered card nested inside the sheet. */
export const cardSurface = cva({
  base: { minWidth: 0 },
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
