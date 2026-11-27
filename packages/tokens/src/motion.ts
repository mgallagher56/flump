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

/**
 * The marketing site's calm scale (owner, 27 Nov 2026; STYLE-GUIDE 11, UX-GUIDELINES M2 and
 * MK4). Prototype 11's `TIMING` (branch `claude/marketing-motion-prototypes-66c08d`,
 * `prototypes/shared/pace.tsx`) times the page's 1.4 slowdown. Kept apart from `durations` so the
 * apps' `fast`, `base` and `slow` never change for it: Panda reads it in `apps/marketing` only (as
 * `durations.marketing.*`), and the native theme leaves it out. No faster variants.
 */
export const marketingDurations = {
  // The pay rise tool's result gliding to its new value on the visitor's input (DECISIONS D7,
  // MK13). The short end of the scale, so the figure keeps up with a slider.
  glide: { value: "588ms" },
  // Hover light, tilt settle, colour changes (420 x 1.4).
  hover: { value: "588ms" },
  // The gap between neighbours arriving (140 x 1.4).
  stagger: { value: "196ms" },
  // A disclosure opening or closing: FAQ, more detail (700 x 1.4).
  disclosure: { value: "980ms" },
  // One card, tag or line arriving (1100 x 1.4).
  entry: { value: "1540ms" },
  // A sample figure tagged "Example" counting to its value, once (1600 x 1.4).
  count: { value: "2240ms" },
  // A chart line drawing itself, once (1900 x 1.4).
  chart: { value: "2660ms" },
  // The whole hero sequence when it plays on time rather than on scroll (3400 x 1.4).
  hero: { value: "4760ms" },
} as const;

/** The marketing easings: a gentle out and a gentle in-out. Neither overshoots. */
export const marketingEasings = {
  // Arriving, opening, gliding.
  calm: { value: "cubic-bezier(0.25, 0.1, 0.2, 1)" },
  // Travel, and a disclosure's height.
  calmInOut: { value: "cubic-bezier(0.45, 0, 0.3, 1)" },
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
  // Sheets slide in solid: fading one in let the page show through it while it moved (phone check,
  // 27 November 2026). The same distances as slideUp and slideInRight, with no opacity.
  sheetUp: {
    from: { transform: "translateY(8px)" },
    to: { transform: "translateY(0)" },
  },
  sheetInRight: {
    from: { transform: "translateX(24px)" },
    to: { transform: "translateX(0)" },
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
