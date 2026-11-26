import { createContext, useContext, useEffect, useState } from "react";

/**
 * Round three's one set of timing tokens (prototypes 8 to 10). Every duration and every
 * scroll-scrubbed distance is the Calm value times the pace factor; the dev panel's Speed control
 * switches the factor so the owner can find the pace he likes. Calm is the default.
 *
 * CSS reads the same values as custom properties set on the prototype root (see kit3.css):
 * `--pace` is the factor and `--t-*` the durations, so CSS and GSAP stay in step.
 */
export type Pace = "calm" | "medium" | "brisk";

export const PACE_FACTOR: Record<Pace, number> = { calm: 1, medium: 0.75, brisk: 0.55 };

export const PACE_LABEL: Record<Pace, string> = { calm: "Calm", medium: "Medium", brisk: "Brisk" };

/** Calm values, in milliseconds. Multiply by the pace factor (`ms()` does it). */
export const TIMING = {
  /** Hover light, tilt settle, colour changes. */
  hover: 420,
  /** A button going down. */
  press: 140,
  /** A button coming back up (soft, no bounce). */
  release: 560,
  /** One card, tag or line arriving. */
  entry: 1100,
  /** The gap between neighbours arriving. */
  stagger: 140,
  /** A disclosure opening or closing (FAQ, more detail). */
  disclosure: 700,
  /** A figure counting to its value. */
  count: 1600,
  /** A chart line drawing itself. */
  chart: 1900,
  /** The whole hero sequence when it plays on time rather than on scroll. */
  hero: 3400,
} as const;

/**
 * Scroll distances for scrubbed sequences, in screen heights at Calm. Longer distance means the
 * same scroll moves the animation less, so it feels slower.
 */
export const SCROLL = {
  /** A section's own moment, from arriving to settled. */
  moment: 0.55,
  /** The hero's assembling pin. */
  heroPin: 1.4,
  /** A sideways stretch. */
  sideways: 1.1,
} as const;

/** Easing: gentle out (arrivals, opening) and gentle in-out (travel). No overshoot anywhere. */
export const EASE = {
  out: "cubic-bezier(0.25, 0.1, 0.2, 1)",
  inOut: "cubic-bezier(0.45, 0, 0.3, 1)",
} as const;

export type Backdrop = "a" | "b" | "both";

export const BACKDROP_LABEL: Record<Backdrop, string> = {
  a: "Sky and teal",
  b: "Violet and rose",
  both: "Both sets together",
};

export interface PaceState {
  pace: Pace;
  factor: number;
  setPace: (pace: Pace) => void;
  backdrop: Backdrop;
  setBackdrop: (backdrop: Backdrop) => void;
  /** A Calm duration in ms scaled to the current pace. */
  ms: (calm: number) => number;
  /** A Calm duration in seconds scaled to the current pace (for GSAP). */
  s: (calmMs: number) => number;
  /** A Calm scroll distance in screen heights scaled to the current pace, as pixels. */
  px: (screens: number) => number;
}

const make = (
  pace: Pace,
  setPace: (p: Pace) => void,
  backdrop: Backdrop,
  setBackdrop: (b: Backdrop) => void,
): PaceState => {
  const factor = PACE_FACTOR[pace];
  return {
    pace,
    factor,
    setPace,
    backdrop,
    setBackdrop,
    ms: (calm) => Math.round(calm * factor),
    s: (calm) => (calm * factor) / 1000,
    px: (screens) =>
      Math.round(screens * factor * (typeof window === "undefined" ? 800 : window.innerHeight)),
  };
};

export const PaceContext = createContext<PaceState>(
  make(
    "calm",
    () => {},
    "a",
    () => {},
  ),
);

export const usePace = () => useContext(PaceContext);

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
};

/** Pace and backdrop choices, remembered in this browser only (a dev convenience). */
export function usePaceState(defaultBackdrop: Backdrop = "a"): PaceState {
  // Pages that default to both sets remember their own choice, so earlier pages keep theirs.
  const backdropKey =
    defaultBackdrop === "a" ? "flump-proto-backdrop" : `flump-proto-backdrop-${defaultBackdrop}`;
  const [pace, setPaceState] = useState<Pace>("calm");
  const [backdrop, setBackdropState] = useState<Backdrop>(defaultBackdrop);
  useEffect(() => {
    setPaceState(read<Pace>("flump-proto-pace", ["calm", "medium", "brisk"], "calm"));
    setBackdropState(read<Backdrop>(backdropKey, ["a", "b", "both"], defaultBackdrop));
  }, [backdropKey, defaultBackdrop]);
  const setPace = (value: Pace) => {
    setPaceState(value);
    write("flump-proto-pace", value);
  };
  const setBackdrop = (value: Backdrop) => {
    setBackdropState(value);
    write(backdropKey, value);
  };
  return make(pace, setPace, backdrop, setBackdrop);
}
