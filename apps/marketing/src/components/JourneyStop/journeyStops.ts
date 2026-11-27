import { MONEY_AREAS, type MoneyAreaKey } from "../../utils/featureAreas";

/** A stop on the journey: one of the five areas, then the finished Home page ("the picture"). */
export type JourneyStopKey = MoneyAreaKey | "picture";

/** The orb's colour at each stop, from the two orb sets (STYLE-GUIDE 2.7). Orb only: never a card. */
export type JourneyOrbTone = "sky" | "teal" | "violet" | "rose";

export interface JourneyStopCopy {
  readonly key: JourneyStopKey;
  /** The plain stop name above the title (no "1 of 6" count: the journey is not a carousel). */
  readonly name: string;
  readonly title: string;
  readonly lead: string;
  readonly fact: string;
  readonly link: { readonly to: string; readonly label: string };
  readonly orbTone: JourneyOrbTone;
}

/** One short fact per area, from the feature pages' own facts (prototype 11's picks). */
const FACT_INDEX: Record<MoneyAreaKey, 0 | 1 | 2> = {
  accounts: 2,
  budget: 1,
  pay: 1,
  "savings-and-pension": 2,
  "debt-and-borrowing": 1,
};

/**
 * Each stop's orb colour, mixing both sets along the way. Debt takes violet, never rose (MK6: the
 * orb's colour never reads as a judgement).
 */
const ORB_TONE: Record<JourneyStopKey, JourneyOrbTone> = {
  accounts: "sky",
  budget: "violet",
  pay: "teal",
  "savings-and-pension": "rose",
  "debt-and-borrowing": "violet",
  picture: "teal",
};

/**
 * The six stops in reading order, their copy from `featureAreas.ts` so the journey and the feature
 * pages cannot drift apart. The last stop links to the interactive preview, not to the invite: the
 * page asks for an invite only in the hero and the close.
 */
export const JOURNEY_STOPS: readonly JourneyStopCopy[] = [
  ...MONEY_AREAS.map((area) => ({
    key: area.key,
    name: area.name,
    title: area.h1,
    lead: area.lead,
    fact: area.facts[FACT_INDEX[area.key]],
    link: { to: area.path, label: `About ${area.name.toLowerCase()} in Flump` },
    orbTone: ORB_TONE[area.key],
  })),
  {
    key: "picture",
    name: "The picture",
    title: "Where you stand, on one page",
    lead: "Your Home page shows your net worth, what is left over each month and your breathing room.",
    fact: "Breathing room is how long your savings would cover the essentials.",
    link: { to: "/preview", label: "Open the interactive preview" },
    orbTone: ORB_TONE.picture,
  },
];

/** The id of a stop's article, for a link into the journey. */
export const journeyStopId = (key: JourneyStopKey) => `journey-stop-${key}`;
