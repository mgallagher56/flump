import { cva } from "../../../styled-system/css";

export const spinnerRecipe = cva({
  base: {
    display: "inline-block",
    flexShrink: 0,
    borderRadius: "full",
    borderStyle: "solid",
    borderColor: "border",
    // Static partial ring when motion is reduced; it rotates only under _motionSafe.
    _motionSafe: {
      animationName: "spin",
      animationDuration: "0.8s",
      animationTimingFunction: "linear",
      animationIterationCount: "infinite",
    },
  },
  variants: {
    size: {
      sm: { width: "16px", height: "16px", borderWidth: "2px" },
      md: { width: "24px", height: "24px", borderWidth: "3px" },
      lg: { width: "40px", height: "40px", borderWidth: "4px" },
    },
    tone: {
      primary: { borderTopColor: "primary" },
      // Follows the surrounding text colour, e.g. inside a button.
      inherit: { borderColor: "currentColor", opacity: 0.35, borderTopColor: "currentColor" },
    },
  },
  defaultVariants: { size: "md", tone: "primary" },
});

export const spinnerRoot = cva({
  base: { display: "inline-flex", alignItems: "center", justifyContent: "center" },
});
