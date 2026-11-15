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
  // E17: a line or tick drawing itself in, once (a chart line on first view, the saved tick).
  draw: { value: "600ms" },
  // E17: an illustration settling on first view, and the wash behind a figure that was just saved.
  // Plays once per visit, never on a loop and never on a financial event (UX-GUIDELINES M5).
  scene: { value: "900ms" },
} as const;

export const easings = {
  standard: { value: "cubic-bezier(0.2, 0.6, 0.2, 1)" },
  enter: { value: "cubic-bezier(0, 0, 0.2, 1)" },
  exit: { value: "cubic-bezier(0.4, 0, 1, 1)" },
  // E17: a soft landing with no overshoot, for `durations.scene` motion.
  settle: { value: "cubic-bezier(0.16, 1, 0.3, 1)" },
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
  // E17: Demo 1 - wash behind a figure that was just saved over durations.scene
  wash: {
    "0%": { opacity: "0" },
    "20%": { opacity: "1" },
    "100%": { opacity: "0" },
  },
  // E17: Demo 3 - check-in advancing between accounts
  slideInLeft: {
    from: { opacity: "0", transform: "translateX(-24px)" },
    to: { opacity: "1", transform: "translateX(0)" },
  },
  slideOutLeft: {
    from: { opacity: "1", transform: "translateX(0)" },
    to: { opacity: "0", transform: "translateX(-24px)" },
  },
  slideOutRight: {
    from: { opacity: "1", transform: "translateX(0)" },
    to: { opacity: "0", transform: "translateX(24px)" },
  },
  // E17: Demo 5 - save confirmation tick draws over durations.base
  tick: {
    from: { strokeDashoffset: "24" },
    to: { strokeDashoffset: "0" },
  },
  // E17: Demo 7 - illustration scene sprout grows and sun rises over durations.scene with easings.settle
  sceneGrow: {
    from: { transform: "scale(0.2)", opacity: "0" },
    to: { transform: "scale(1)", opacity: "1" },
  },
  sceneRise: {
    from: { transform: "translateY(10px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
  },
} as const;
