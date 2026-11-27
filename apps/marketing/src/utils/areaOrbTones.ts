import type { OrbTone } from "../components/GlassOrb";
import type { FeatureGroup } from "./featureIndex";

/*
 * The orb colours of the features and area pages (the approved prototypes, `prototypes/others`,
 * 27 Nov 2026). Pure data. Each area keeps the two colours its journey stop had in the prototype
 * (pay teal with rose, debt and borrowing violet with teal), both sets mixed. Debt is never rose
 * (STYLE-GUIDE MC2); violet there is a stop colour, not a judgement.
 */

/** Four hero orbs, biggest first. */
export type HeroTones = readonly [OrbTone, OrbTone, OrbTone, OrbTone];

/** The features page's hero. */
export const FEATURES_HERO_TONES: HeroTones = ["sky", "violet", "teal", "rose"];

/**
 * Each area page's hero: its own two journey colours first. Pay and debt and borrowing are the
 * approved prototype's; accounts, budget and savings and pension have no prototype of their own and
 * follow the same template (their journey colours first, then the two others, both sets mixed).
 */
export const AREA_HERO_TONES: Record<
  "accounts" | "budget" | "pay" | "savings-and-pension" | "debt-and-borrowing",
  HeroTones
> = {
  accounts: ["sky", "violet", "teal", "rose"],
  budget: ["violet", "teal", "sky", "rose"],
  pay: ["teal", "rose", "sky", "violet"],
  "savings-and-pension": ["rose", "sky", "violet", "teal"],
  // Never rose on the debt page.
  "debt-and-borrowing": ["violet", "teal", "sky", "teal"],
};

/** The AI connection page's hero (its approved prototype); its question cards' orbs take them in turn. */
export const AI_HERO_TONES: HeroTones = ["rose", "sky", "violet", "teal"];

/** Each index group's small orb: its area's journey colour; the groups that are not areas take the other set. */
export const GROUP_TONES: Record<FeatureGroup["key"], OrbTone> = {
  home: "sky",
  accounts: "sky",
  budget: "violet",
  pay: "teal",
  "savings-and-pension": "rose",
  "debt-and-borrowing": "violet",
  "ai-connection": "rose",
  settings: "teal",
};
