/*
 * The contract between prototype 11 (the three.js journey) and 11b (the CSS journey). Light on
 * purpose: types and a few constants only, nothing that pulls in three.js, GSAP or React.
 *
 * How a journey works in 11 and 11b:
 *
 * - `Page11` renders `<Journey stops={JOURNEY_STOPS} intro={...} />` in the journey slot.
 * - The Journey renders each stop with `JourneyStop` from `p11/stops/JourneyStop.tsx` (shared
 *   DOM: the text panel and the information component, with their arrive, rest and leave
 *   choreography). Each stop section is in normal flow and carries the SectionNav markers.
 * - The Journey adds only the travelling layer: an aria-hidden stage, sticky inside the journey
 *   wrapper, where the orb keeps moving with scroll, including while both sides of a stop rest.
 * - Hooks a travelling layer can read from the DOM:
 *     [data-journey]              the journey wrapper (the travelling layer's scroll range)
 *     [data-journey-stop]         each stop section, with data-stop-key and data-stop (1-based)
 *     [data-stop-frame]           the sticky frame inside a stop that holds still during the rest
 *     [data-card-side]            "left" or "right": which side the information component is on
 *     --stop-rest                 CSS length on the journey: how long each rest lasts
 */

import type { MoneyAreaKey } from "../../src/utils/featureAreas";

/** A stop on the journey: one of the five areas, or the finished Home page ("the picture"). */
export type StopKey = MoneyAreaKey | "dashboard";

/** What `Page11` passes to the journey slot. */
export interface JourneyProps {
  /** The stops, in order. */
  stops: readonly StopKey[];
  /** Placed inside the journey before the first stop (the hero), so it can sit in the scene. */
  intro?: import("react").ReactNode;
}

/** Every stop, in the order the page shows them. */
export const JOURNEY_STOPS: readonly StopKey[] = [
  "accounts",
  "budget",
  "pay",
  "savings-and-pension",
  "debt-and-borrowing",
  "dashboard",
];

/** The id of a stop's section, for a scroll cue or a link into the journey. */
export const journeyStopId = (key: StopKey) => `p11-stop-${key}`;

/** Short names for SectionNav. */
export const STOP_SHORT: Record<StopKey, string> = {
  accounts: "Accounts",
  budget: "Budget",
  pay: "Pay",
  "savings-and-pension": "Savings",
  "debt-and-borrowing": "Debt",
  dashboard: "The picture",
};

/**
 * One stop's scroll, in screens (viewport heights) at the Calm pace, times the pace factor
 * (`usePace().factor`) for the rest. Arrive: the pair rises into place together. Rest: the frame
 * is sticky and both sides hold completely still while the orb travels. Leave: the pair scrolls
 * away together as the next pair arrives (the leave of one stop is the arrive of the next).
 */
export const STOP_SCROLL = { arrive: 1, rest: 1, leave: 1 } as const;

/**
 * The orb palette: both bubble colour sets together, as token names (read with `tokenColour` in
 * three.js or `var(...)` in CSS). Set A is sky and teal, set B violet and rose; the saturated
 * chart series carry the glass body, the pale surface tints the bubbles' fill.
 */
export const ORB_SETS = {
  a: ["--colors-chart-series6", "--colors-chart-series1"],
  b: ["--colors-chart-series4", "--colors-chart-series5"],
} as const;

/** All four orb colours, alternating sets: sky, violet, teal, rose. */
export const ORB_TOKENS = [ORB_SETS.a[0], ORB_SETS.b[0], ORB_SETS.a[1], ORB_SETS.b[1]] as const;

/** The four orb colours by name, as token names (the same mapping as `GlassOrb`'s tones). */
export const ORB_TONE_TOKEN = {
  sky: ORB_SETS.a[0],
  teal: ORB_SETS.a[1],
  violet: ORB_SETS.b[0],
  rose: ORB_SETS.b[1],
} as const;

export type OrbToneName = keyof typeof ORB_TONE_TOKEN;

/**
 * Each stop's two journey colours: its own (the same as its emblem) and an accent from the other
 * set, so every stop mixes both sets (sky or teal with violet or rose). The orb turns from a stop's
 * colour to its accent during the rest, and arrives at the next stop in that stop's colour.
 */
export const STOP_ORB_TONES: Record<StopKey, readonly [OrbToneName, OrbToneName]> = {
  accounts: ["sky", "violet"],
  budget: ["violet", "teal"],
  pay: ["teal", "rose"],
  "savings-and-pension": ["rose", "sky"],
  "debt-and-borrowing": ["violet", "teal"],
  dashboard: ["teal", "rose"],
};
