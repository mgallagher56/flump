import { cva } from "@repo/ui/styled-system/css";

/** Thin indeterminate bar pinned above the header while a navigation is in flight. */
export const navigationProgressBar = cva({
  base: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    height: "2px",
    zIndex: "toast",
    pointerEvents: "none",
    backgroundColor: "chart.primary",
    // Reduced motion: a static bar still signals loading; motion only when allowed.
    _motionSafe: {
      backgroundColor: "transparent",
      backgroundImage:
        "linear-gradient(90deg, {colors.chart.primary} 0%, {colors.primary.border} 50%, {colors.chart.primary} 100%)",
      backgroundSize: "200% 100%",
      animationName: "shimmer",
      animationDuration: "slow",
      animationTimingFunction: "standard",
      animationIterationCount: "infinite",
    },
  },
});
