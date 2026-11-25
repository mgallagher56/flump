import { cva } from "@repo/ui/styled-system/css";

export const noticeLink = cva({
  base: {
    color: "inherit",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
