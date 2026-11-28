import type { BubbleSpot } from "../BubbleField";

/*
 * The home hero's background bubbles (owner, 28 Nov 2026: "add some more background orbs in the
 * homepage hero as it looks a bit bare"; prototype 11 had two). Still glass bubbles in the orb
 * sets, in the hero's empty space and never behind or touching the heading, the lead, the calls to
 * action, the scroll cue or the "Monthly picture" and its floating pieces (an e2e check measures
 * the clearance at 2000, 1440, 1000 and 390px).
 *
 * Places are CSS lengths in the bubble field, which spans the window's width and the hero's
 * column's height: `cqw` and `cqh` are those. From 64rem, `G` is the gutter beside the 76rem
 * column, and a gutter bubble is sized by it, so a narrow gutter draws a smaller one or none.
 */
const G = "max(1.5rem, (100cqw - 76rem) / 2)";
/** Stacked, the gutter beside the 46rem dashboard. */
const S = "((100cqw - 46rem) / 2)";

/** Prototype 11's two bubbles, kept clear of the dashboard: the large one sized by the gutter. */
const TODAY: readonly BubbleSpot[] = [
  {
    set: "skyTeal",
    x: "calc(100cqw - 20px)",
    y: "calc(8cqh + 130px)",
    size: `clamp(0px, 2 * (${G} - 32px), 260px)`,
    show: "wide",
    drift: 24,
  },
  {
    set: "violetRose",
    x: `calc(${G} + 22.5rem)`,
    y: "88cqh",
    size: "120px",
    show: "wide",
    drift: 60,
  },
  // Stacked, beside the dashboard where there is room.
  {
    set: "skyTeal",
    x: `calc(100cqw - ${S} / 2)`,
    y: "58cqh",
    size: `clamp(0px, ${S} - 3rem, 96px)`,
    show: "roomy",
    drift: 30,
  },
];

/** About three more: above the heading, in the left gutter and low in the right gutter. */
const LIGHT: readonly BubbleSpot[] = [
  { set: "skyTeal", x: `calc(${G} + 7.5rem)`, y: "13cqh", size: "72px", show: "wide", drift: 80 },
  {
    set: "violetRose",
    x: `calc(${G} / 2)`,
    y: "62cqh",
    size: `clamp(0px, ${G} - 24px, 180px)`,
    show: "wide",
    drift: 30,
  },
  {
    set: "skyTeal",
    x: `calc(100cqw - ${G} / 2)`,
    y: "80cqh",
    size: `clamp(0px, ${G} - 40px, 140px)`,
    show: "wide",
    drift: 40,
  },
  {
    set: "violetRose",
    x: `calc(${S} / 2)`,
    y: "82cqh",
    size: `clamp(0px, ${S} - 3rem, 96px)`,
    show: "roomy",
    drift: 30,
  },
  { set: "skyTeal", x: "calc(50cqw - 8.5rem)", y: "21rem", size: "36px", show: "phone", drift: 0 },
];

/** Two more from 64rem, and one each side of the calls to action when stacked. */
const MEDIUM: readonly BubbleSpot[] = [
  {
    set: "skyTeal",
    x: `calc(${G} * 0.3)`,
    y: "24cqh",
    size: `clamp(0px, ${G} * 0.5, 120px)`,
    show: "wide",
    drift: 50,
  },
  { set: "violetRose", x: `calc(${G} + 30rem)`, y: "92cqh", size: "44px", show: "wide", drift: 90 },
  { set: "skyTeal", x: "calc(50cqw - 20rem)", y: "11rem", size: "64px", show: "stacked", drift: 0 },
  {
    set: "violetRose",
    x: "calc(50cqw + 17rem)",
    y: "15rem",
    size: "44px",
    show: "stacked",
    drift: 0,
  },
  {
    set: "violetRose",
    x: "calc(50cqw + 8rem)",
    y: "20.25rem",
    size: "26px",
    show: "phone",
    drift: 0,
  },
];

/** Three more small ones from 64rem: above the dashboard, between the columns and under it. */
const FULLER: readonly BubbleSpot[] = [
  {
    set: "violetRose",
    x: `calc(100cqw - ${G} - 9rem)`,
    y: "5cqh",
    size: "44px",
    show: "wide",
    drift: 70,
  },
  { set: "skyTeal", x: `calc(${G} + 33rem)`, y: "20cqh", size: "36px", show: "wide", drift: 100 },
  {
    set: "skyTeal",
    x: `calc(100cqw - ${G} - 6rem)`,
    y: "96cqh",
    size: "40px",
    show: "wide",
    drift: 80,
  },
];

export type HeroBubbleDensity = "light" | "medium" | "fuller";

/** The three options the owner compared (captures in the lane's notes); each adds to the last. */
export const HERO_BUBBLES: Record<HeroBubbleDensity, readonly BubbleSpot[]> = {
  light: [...TODAY, ...LIGHT],
  medium: [...TODAY, ...LIGHT, ...MEDIUM],
  fuller: [...TODAY, ...LIGHT, ...MEDIUM, ...FULLER],
};

/** The one the page uses. */
export const HERO_BUBBLE_DENSITY: HeroBubbleDensity = "medium";
