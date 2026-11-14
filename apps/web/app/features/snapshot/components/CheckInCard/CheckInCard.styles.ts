import { cva } from "@repo/ui/styled-system/css";

export const cardRoot = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

export const cardSurface = cva({
  base: {
    padding: "16px",
    borderRadius: "card",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    // One height for every account, open or done, so the sheet does not jump between steps at
    // 375. Taller steps (a calculated figure with a statement prompt) still grow.
    minHeight: "15rem",
  },
});

/** Back and Next. Holds a button's height when neither shows, so the sheet keeps its height. */
export const cardNav = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    minHeight: "density.control.md",
    "@media (pointer: coarse)": { minHeight: "touch" },
  },
});

/** "No change to the rest": the same quiet ghost button as in the desktop list. */
export const restButton = cva({
  base: { alignSelf: "flex-start" },
});
