import { cva } from "../../../styled-system/css";

export const savedFigureRecipe = cva({
  base: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    padding: "4",
    minWidth: "14rem",
    display: "flex",
    flexDirection: "column",
    gap: "1",
    // Wash overlay that runs Demo 1 pale teal wash
    "&::before": {
      content: '""',
      position: "absolute",
      inset: "0",
      backgroundColor: "primary.subtle",
      opacity: 0,
      pointerEvents: "none",
    },
    '&[data-wash="true"]::before': {
      _motionSafe: {
        animationName: "wash",
        animationDuration: "scene",
        animationTimingFunction: "settle",
        animationIterationCount: 1,
      },
      _motionReduce: {
        animation: "none",
        opacity: 0,
      },
    },
  },
});

export const savedFigureLabelRecipe = cva({
  base: {
    fontSize: "sm",
    color: "text.secondary",
    display: "block",
  },
});

export const savedFigureValueRecipe = cva({
  base: {
    fontSize: "2xl",
    fontWeight: "semibold",
    lineHeight: "1.3",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    display: "block",
    _motionSafe: {
      transitionProperty: "opacity",
      transitionDuration: "fast",
      transitionTimingFunction: "standard",
    },
    '&[data-out="true"]': {
      opacity: 0,
    },
    _motionReduce: {
      transition: "none",
      '&[data-out="true"]': {
        opacity: 1,
      },
    },
  },
});
