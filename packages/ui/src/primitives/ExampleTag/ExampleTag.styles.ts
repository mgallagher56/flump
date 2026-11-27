import { cva } from "../../../styled-system/css";

/**
 * The "Example" tag on a document card or a sample figure (STYLE-GUIDE 8.3, UX-GUIDELINES MK7).
 * Real text at 12px (`label.sm`) with a real 1px border, so it scales with text size and keeps
 * its outline in forced colours (the border becomes CanvasText; `forcedColorAdjust` stays auto).
 */
export const exampleTagRecipe = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    flex: "none",
    px: "8px",
    py: "2px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    textStyle: "label.sm",
    whiteSpace: "nowrap",
    userSelect: "none",
  },
  variants: {
    variant: {
      /** On paper or a card: a sunken fill, secondary text and the strong border. */
      paper: {
        backgroundColor: "surface.sunken",
        color: "text.secondary",
        borderColor: "border.strong",
      },
      /** On the charcoal `surface.contrast` card: no fill, the off-white text and edge. */
      onContrast: {
        backgroundColor: "transparent",
        color: "text.onContrast",
        borderColor: "text.onContrast",
      },
    },
  },
  defaultVariants: {
    variant: "paper",
  },
});
