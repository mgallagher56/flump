import { cva } from "@repo/ui/styled-system/css";

/**
 * The result card and, from lg, one still scene in the half row it leaves empty (B10). The card
 * comes first, so on a phone it is the only thing in the row.
 */
export const breathingRoomRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 28rem) minmax(0, 1fr)" },
    gap: "6",
    alignItems: "center",
  },
});

/** The result card keeps to a readable width; the section header spans the page. */
export const breathingRoomResult = cva({
  base: { width: "100%", maxWidth: "28rem" },
});

/** Hidden below lg, so the scene never pushes the figure down on a phone or tablet. */
export const breathingRoomScene = cva({
  base: {
    display: { base: "none", lg: "flex" },
    justifyContent: "center",
    alignItems: "center",
    minWidth: "0",
  },
});

export const breathingRoomFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
