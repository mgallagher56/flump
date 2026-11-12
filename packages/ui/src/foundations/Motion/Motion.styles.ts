import { css, cva } from "../../../styled-system/css";

export const motionGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
    gap: "16px",
  },
});

export const motionTile = cva({
  base: {
    p: "16px",
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    backgroundColor: "surface.card",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
});

export const motionSample = cva({
  base: {
    height: "48px",
    borderRadius: "md",
    backgroundColor: "primary.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "primary.border",
  },
});

// Animation classes are static literals so Panda can extract them. They are applied only when
// the demo's own reduced-motion toggle is off, and always sit under `_motionSafe` so the OS
// preference also wins.
export const animationClass = {
  fadeIn: css({
    _motionSafe: {
      animationName: "fadeIn",
      animationDuration: "slow",
      animationTimingFunction: "enter",
      animationFillMode: "both",
    },
  }),
  slideUp: css({
    _motionSafe: {
      animationName: "slideUp",
      animationDuration: "slow",
      animationTimingFunction: "enter",
      animationFillMode: "both",
    },
  }),
  scaleIn: css({
    _motionSafe: {
      animationName: "scaleIn",
      animationDuration: "base",
      animationTimingFunction: "standard",
      animationFillMode: "both",
    },
  }),
  shimmer: css({
    backgroundImage: "linear-gradient(90deg, transparent, {colors.border.strong}, transparent)",
    backgroundSize: "200% 100%",
    _motionSafe: {
      animationName: "shimmer",
      animationDuration: "slow",
      animationTimingFunction: "standard",
      animationIterationCount: "infinite",
    },
  }),
} as const;
