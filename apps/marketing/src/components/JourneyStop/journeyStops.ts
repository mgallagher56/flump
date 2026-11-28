import { MONEY_AREAS, type MoneyAreaKey } from "../../utils/featureAreas";
import type { OrbTone } from "../GlassOrb/GlassOrb";

/** A stop on the journey: one of the five areas, then the finished Home page ("the picture"). */
export type JourneyStopKey = MoneyAreaKey | "picture";

export interface JourneyStopCopy {
  readonly key: JourneyStopKey;
  /** The short name the page's stop control shows (`data-home-section-name`). */
  readonly short: string;
  readonly title: string;
  readonly lead: string;
  readonly fact: string;
  /** The area page; the last stop has the page's call to action (the interactive preview) instead. */
  readonly link?: { readonly to: string; readonly label: string };
  /**
   * The orb's two colours at this stop (prototype 11's `STOP_ORB_TONES`): its own on arrival, and
   * an accent from the other set it turns to during the rest. Orb only: never a card.
   */
  readonly orbTones: readonly [OrbTone, OrbTone];
  /** The small dot beside "N of 6" (prototype 11's quiet accent, orb-like). */
  readonly dot: OrbTone;
}

/** One short fact per area, from the feature pages' own facts (prototype 11's picks). */
const FACT_INDEX: Record<MoneyAreaKey, 0 | 1 | 2> = {
  accounts: 2,
  budget: 1,
  pay: 1,
  "savings-and-pension": 2,
  "debt-and-borrowing": 1,
};

const SHORT: Record<JourneyStopKey, string> = {
  accounts: "Accounts",
  budget: "Budget",
  pay: "Pay",
  "savings-and-pension": "Savings",
  "debt-and-borrowing": "Debt",
  picture: "The picture",
};

/**
 * Each stop's orb colours, mixing both sets along the way (prototype 11). Debt keeps sky, the
 * neutral colour the journey opens with, and teal, never violet or rose (STYLE-GUIDE MC2: no orb
 * colour is paired with a debt; MK6).
 */
const ORB_TONES: Record<JourneyStopKey, readonly [OrbTone, OrbTone]> = {
  accounts: ["sky", "violet"],
  budget: ["violet", "teal"],
  pay: ["teal", "rose"],
  "savings-and-pension": ["rose", "sky"],
  "debt-and-borrowing": ["sky", "teal"],
  picture: ["teal", "rose"],
};

/**
 * The kicker dot: violet and rose alternating, debt violet, as prototype 11's accent. Never rose on
 * debt. Only the travelling orb at debt stays sky (owner-side ruling B, `ORB_TONES` above).
 */
const DOT: Record<JourneyStopKey, OrbTone> = {
  accounts: "violet",
  budget: "rose",
  pay: "violet",
  "savings-and-pension": "rose",
  "debt-and-borrowing": "violet",
  picture: "rose",
};

/**
 * The six stops in reading order, their copy from `featureAreas.ts` so the journey and the feature
 * pages cannot drift apart. The last stop ends on the page's call to action, the interactive preview.
 */
export const JOURNEY_STOPS: readonly JourneyStopCopy[] = [
  ...MONEY_AREAS.map((area) => ({
    key: area.key,
    short: SHORT[area.key],
    title: area.h1,
    lead: area.lead,
    fact: area.facts[FACT_INDEX[area.key]],
    link: { to: area.path, label: `About ${area.name.toLowerCase()} in Flump` },
    orbTones: ORB_TONES[area.key],
    dot: DOT[area.key],
  })),
  {
    key: "picture",
    short: SHORT.picture,
    title: "Where you stand, on one page",
    lead: "Your Home page shows your net worth, what is left over each month and your breathing room.",
    fact: "Breathing room is how long your savings would cover the essentials.",
    orbTones: ORB_TONES.picture,
    dot: DOT.picture,
  },
];

/** The id of a stop's section, for a link into the journey. */
export const journeyStopId = (key: JourneyStopKey) => `journey-stop-${key}`;

/**
 * How the stops play once the journey is live: `pinned` (the default) changes the pairs over in
 * place under the header; `scroll` (`?stops=scroll`, owner, 28 Nov 2026) lets each pair scroll in
 * with the page, hold centred for a run of scroll and scroll out.
 */
export type StopsMode = "pinned" | "scroll";

/** Reads the stops' mode from the address on the client: `?stops=scroll`, otherwise pinned. */
export const stopsModeFrom = (search: string): StopsMode =>
  new URLSearchParams(search).get("stops") === "scroll" ? "scroll" : "pinned";
