import { cva } from "@repo/ui/styled-system/css";

/**
 * The result card, at a readable width. The budget page's one illustration is its page icon in
 * the header, so this row holds no scene of its own.
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

export const breathingRoomFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
