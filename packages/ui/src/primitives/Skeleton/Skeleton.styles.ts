import { cva } from "../../../styled-system/css";

export const skeletonRecipe = cva({
  base: {
    display: "block",
    backgroundColor: "surface.sunken",
    // A slow, gentle pulse only when motion is allowed (a sweeping shimmer read as flicker on short
    // loads); otherwise a flat placeholder. Show skeletons through `PendingReveal`, which holds them
    // back on fast loads.
    _motionSafe: {
      animationName: "pulse",
      animationDuration: "loop",
      animationTimingFunction: "standard",
      animationDirection: "alternate",
      animationIterationCount: "infinite",
    },
  },
  variants: {
    shape: {
      // One line of body text.
      text: { height: "1em", width: "100%", borderRadius: "sm" },
      // A heading-weight line, shorter by default.
      line: { height: "1.5rem", width: "60%", borderRadius: "md" },
      block: { width: "100%", borderRadius: "xl" },
      circle: { borderRadius: "full" },
    },
    size: {
      sm: {},
      md: {},
      lg: {},
    },
  },
  compoundVariants: [
    { shape: "block", size: "sm", css: { height: "4rem" } },
    { shape: "block", size: "md", css: { height: "8rem" } },
    { shape: "block", size: "lg", css: { height: "16rem" } },
    { shape: "circle", size: "sm", css: { width: "32px", height: "32px" } },
    { shape: "circle", size: "md", css: { width: "48px", height: "48px" } },
    { shape: "circle", size: "lg", css: { width: "72px", height: "72px" } },
  ],
  defaultVariants: { shape: "text", size: "md" },
});

export const skeletonLines = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", width: "100%" },
});

export const skeletonLastLine = cva({ base: { width: "60%" } });
