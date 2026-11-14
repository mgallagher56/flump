import { cva } from "@repo/ui/styled-system/css";

/** Thin indeterminate bar pinned above the header while a slow navigation is in flight. */
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
    // Reduced motion: a static bar still signals loading. Otherwise a slow, gentle pulse (a sweep
    // read as flicker on short loads).
    _motionSafe: {
      animationName: "pulse",
      animationDuration: "loop",
      animationTimingFunction: "standard",
      animationDirection: "alternate",
      animationIterationCount: "infinite",
    },
  },
});
