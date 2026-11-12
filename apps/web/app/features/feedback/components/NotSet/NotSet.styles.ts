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
    color: "status.info.text",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _hover: { textDecorationThickness: "2px" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
