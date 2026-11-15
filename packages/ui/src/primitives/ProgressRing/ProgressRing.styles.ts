import { sva } from "../../../styled-system/css";

export const progressRingRecipe = sva({
  slots: ["root", "svg", "track", "arc", "count"],
  base: {
    root: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    svg: {
      display: "block",
      width: "100%",
      height: "100%",
    },
    track: {
      fill: "none",
      stroke: "border",
      strokeWidth: "3.5",
    },
    arc: {
      fill: "none",
      stroke: "primary",
      strokeWidth: "3.5",
      strokeLinecap: "round",
      _motionSafe: {
        transitionProperty: "stroke-dashoffset",
        transitionDuration: "slow",
        transitionTimingFunction: "standard",
      },
      _motionReduce: {
        transition: "none",
      },
    },
    count: {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "text.primary",
      textStyle: "label.sm",
      fontWeight: "semibold",
      lineHeight: "1",
      letterSpacing: "-0.02em",
      fontVariantNumeric: "tabular-nums",
      pointerEvents: "none",
      userSelect: "none",
    },
  },
  variants: {
    size: {
      sm: { root: { width: "9", height: "9" } },
      md: { root: { width: "10", height: "10" } },
      lg: { root: { width: "12", height: "12" } },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
