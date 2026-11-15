import { cva } from "@repo/ui/styled-system/css";

/** The result card keeps to a readable width; the section header spans the page. */
export const breathingRoomResult = cva({
  base: { width: "100%", maxWidth: "28rem" },
});

export const breathingRoomFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
