import { cva } from "../../../styled-system/css";

/** Short label bubble. Above Dialog (200) and popovers (250). */
export const tooltipContentRecipe = cva({
  base: {
    zIndex: 260,
    backgroundColor: "surface.overlay",
    color: "text.primary",
    textStyle: "label.sm",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: "border.subtle",
    boxShadow: "overlay",
    paddingX: "3",
    paddingY: "1.5",
    maxWidth: "min(260px, calc(100vw - 32px))",
    userSelect: "none",
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "fast",
      animationTimingFunction: "enter",
    },
  },
});
