import { cva } from "@repo/ui/styled-system/css";

/** The "Add ..." link next to a "Not set" label. Underlined so it never rests on colour alone. */
export const notSetLink = cva({
  base: {
    textStyle: "label.md",
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { textDecoration: "none" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
