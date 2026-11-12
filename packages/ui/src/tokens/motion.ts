/**
 * E15 motion tokens. Plain strings so E12 can read them as data and so reduced-motion handling is
 * a consumer concern: apply keyframes/animations only under `_motionSafe`, and gate any JS-driven
 * motion on `prefers-reduced-motion`.
 */
export const durations = {
  instant: { value: "0ms" },
  fast: { value: "120ms" },
  base: { value: "200ms" },
  slow: { value: "320ms" },
} as const;

export const easings = {
  standard: { value: "cubic-bezier(0.2, 0.6, 0.2, 1)" },
  enter: { value: "cubic-bezier(0, 0, 0.2, 1)" },
  exit: { value: "cubic-bezier(0.4, 0, 1, 1)" },
} as const;

/** Panda `keyframes`. Reference only under `_motionSafe` (e.g. `_motionSafe: { animation: ... }`). */
export const motionKeyframes = {
  fadeIn: {
    from: { opacity: "0" },
    to: { opacity: "1" },
  },
  slideUp: {
    from: { opacity: "0", transform: "translateY(8px)" },
    to: { opacity: "1", transform: "translateY(0)" },
  },
  scaleIn: {
    from: { opacity: "0", transform: "scale(0.96)" },
    to: { opacity: "1", transform: "scale(1)" },
  },
  shimmer: {
    "0%": { backgroundPosition: "-200% 0" },
    "100%": { backgroundPosition: "200% 0" },
  },
} as const;
