import { cva } from "@repo/ui/styled-system/css";

export const notSetWrapper = cva({
  base: {
    display: "inline-flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: "8px",
    fontVariantNumeric: "tabular-nums",
  },
});

export const notSetLabel = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const notSetAction = cva({
  base: {
    fontSize: "xs",
    fontWeight: "semibold",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _hover: { color: "primary.hover" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
