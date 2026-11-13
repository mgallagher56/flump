import { cva } from "@repo/ui/styled-system/css";

// Full-opacity text (contrast) with a dashed outline and lock icon to signal "not available".
export const disabledLink = cva({
  base: {
    cursor: "not-allowed",
    color: "text.secondary",
    textDecoration: "none",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "border.input",
    borderRadius: "md",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
