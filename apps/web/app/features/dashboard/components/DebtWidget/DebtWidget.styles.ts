import { cva } from "@repo/ui/styled-system/css";

export const headlineRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  },
});

/** A date or short text value in a stat tile (dates are tabular too). */
export const statTextValue = cva({
  base: {
    textStyle: "label.md",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});
