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
  // One turn of a continuous loop (the pending spinner in Button). Under reduced motion it slows
  // further rather than stopping, because it says "loading".
  loop: { value: "800ms" },
  // Loading timings (UX-GUIDELINES "Loading"), read by `useDelayedPending` in packages/ui and by the
  // mobile app. A wait shorter than `pendingDelay` shows no loading UI at all; once loading UI shows
  // it stays at least `pendingMinimum`, so it never blinks; content then fades in over `reveal`.
  reveal: { value: "150ms" },
  pendingDelay: { value: "200ms" },
  pendingMinimum: { value: "400ms" },
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
  slideInRight: {
    from: { opacity: "0", transform: "translateX(24px)" },
    to: { opacity: "1", transform: "translateX(0)" },
  },
  scaleIn: {
    from: { opacity: "0", transform: "scale(0.96)" },
    to: { opacity: "1", transform: "scale(1)" },
  },
  // A gentle placeholder pulse for skeletons and the navigation bar: run it with `durations.loop`
  // and `animationDirection: alternate` (a 1.6s breath), never a sweep.
  pulse: {
    from: { opacity: "1" },
    to: { opacity: "0.55" },
  },
  shimmer: {
    "0%": { backgroundPosition: "-200% 0" },
    "100%": { backgroundPosition: "200% 0" },
  },
} as const;
