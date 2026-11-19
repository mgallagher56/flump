import { cva } from "@repo/ui/styled-system/css";

/**
 * The result card and its source line, with what the figure counts beside it from lg (owner item
 * 32b) and under it on smaller screens. The budget page's one illustration is its page icon in the
 * header, so this row holds no scene of its own.
 */
export const breathingRoomRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 28rem) minmax(0, 1fr)" },
    gap: "6",
    alignItems: "start",
  },
});

/** The result card and the line saying where its figure comes from. */
export const breathingRoomSide = cva({
  base: { display: "flex", flexDirection: "column", gap: "3", minWidth: 0 },
});

/** The result card keeps to a readable width; the section header spans the page. */
export const breathingRoomResult = cva({
  base: { width: "100%", maxWidth: "28rem" },
});

export const breathingRoomFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

/** "From your savings of £X and essentials of £Y a month." Plain, no tip needed (item 31). */
export const breathingRoomSource = cva({
  base: {
    margin: "0",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const breathingRoomSourceLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    whiteSpace: "nowrap",
  },
});
