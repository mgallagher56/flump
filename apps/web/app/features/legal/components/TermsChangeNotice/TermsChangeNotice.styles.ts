import { cva } from "@repo/ui/styled-system/css";

export const noticeRow = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "3",
    paddingX: { base: "4", md: "6" },
    paddingY: "4",
    borderTop: "1px solid",
    borderColor: "border.subtle",
  },
});

export const noticeText = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
});

export const noticeLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _hover: { color: "primary.emphasis" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
