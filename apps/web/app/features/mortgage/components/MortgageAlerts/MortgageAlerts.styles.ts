import { cva } from "@repo/ui/styled-system/css";

/** A plain line on the page surface: no status fill, border or icon (E16 PR 6). */
export const alertLine = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px 12px",
    minWidth: 0,
  },
});

export const alertText = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
    flex: "1 1 240px",
    minWidth: 0,
  },
});
