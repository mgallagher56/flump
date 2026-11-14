import { cva } from "@repo/ui/styled-system/css";

/** One quiet line under a net worth figure: no colour, no warning tone (net worth choices). */
export const basisLine = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, maxWidth: "65ch" },
});

export const basisLink = cva({
  base: {
    color: "text.primary",
    textDecoration: "underline",
    textDecorationColor: "border.strong",
    textUnderlineOffset: "3px",
    borderRadius: "sm",
    whiteSpace: "nowrap",
    _hover: { color: "primary", textDecorationColor: "currentColor" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
