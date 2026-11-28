import { css } from "@repo/ui/styled-system/css";
import type { BubbleSpot } from "../BubbleField";

/*
 * The home hero's background bubbles (owner, 28 Nov 2026: "add some more background orbs in the
 * homepage hero as it looks a bit bare"; prototype 11 had two). Still glass bubbles in the orb
 * sets, in the hero's empty space and never behind or touching the heading, the lead, the calls to
 * action, the scroll cue or the "Monthly picture" and its floating pieces (an e2e check measures
 * the clearance at 2000, 1440, 1000 and 390px).
 *
 * Each place sets the bubble's centre (`--spot-x`, `--spot-y`), diameter (`--spot-size`) and
 * drift, as CSS lengths in the bubble field, which spans the window's width and the hero column's
 * height: `cqw` and `cqh` are those. From 64rem the gutter beside the 76rem column is
 * `max(1.5rem, (100cqw - 76rem) / 2)`, and a gutter bubble is sized by it, so a narrow gutter draws
 * a smaller one or none; stacked, the gutter beside the 46rem dashboard is
 * `(100cqw - 46rem) / 2`. Written out each time: Panda reads styles statically.
 */

/** Prototype 11's two bubbles, kept clear of the dashboard: the large one sized by the gutter. */
const TODAY: readonly BubbleSpot[] = [
  {
    set: "skyTeal",
    show: "wide",
    place: css({
      "--spot-x": "calc(100cqw - 20px)",
      "--spot-y": "calc(8cqh + 130px)",
      "--spot-size": "clamp(0px, 2 * (max(1.5rem, (100cqw - 76rem) / 2) - 32px), 260px)",
      "--drift-from": "24px",
      "--drift-to": "-24px",
    }),
  },
  {
    set: "violetRose",
    show: "wide",
    place: css({
      "--spot-x": "calc(max(1.5rem, (100cqw - 76rem) / 2) + 22.5rem)",
      "--spot-y": "88cqh",
      "--spot-size": "120px",
      "--drift-from": "60px",
      "--drift-to": "-60px",
    }),
  },
  // Stacked, beside the dashboard where there is room.
  {
    set: "skyTeal",
    show: "roomy",
    place: css({
      "--spot-x": "calc(100cqw - (100cqw - 46rem) / 4)",
      "--spot-y": "58cqh",
      "--spot-size": "clamp(0px, (100cqw - 46rem) / 2 - 3rem, 96px)",
      "--drift-from": "30px",
      "--drift-to": "-30px",
    }),
  },
];

/** About three more: above the heading, in the left gutter and low in the right gutter. */
const LIGHT: readonly BubbleSpot[] = [
  {
    set: "skyTeal",
    show: "wide",
    place: css({
      "--spot-x": "calc(max(1.5rem, (100cqw - 76rem) / 2) + 7.5rem)",
      "--spot-y": "13cqh",
      "--spot-size": "72px",
      "--drift-from": "80px",
      "--drift-to": "-80px",
    }),
  },
  {
    set: "violetRose",
    show: "wide",
    place: css({
      "--spot-x": "calc(max(1.5rem, (100cqw - 76rem) / 2) / 2)",
      "--spot-y": "62cqh",
      "--spot-size": "clamp(0px, max(1.5rem, (100cqw - 76rem) / 2) - 24px, 180px)",
      "--drift-from": "30px",
      "--drift-to": "-30px",
    }),
  },
  {
    set: "skyTeal",
    show: "wide",
    place: css({
      "--spot-x": "calc(100cqw - max(1.5rem, (100cqw - 76rem) / 2) / 2)",
      "--spot-y": "80cqh",
      "--spot-size": "clamp(0px, max(1.5rem, (100cqw - 76rem) / 2) - 40px, 140px)",
      "--drift-from": "40px",
      "--drift-to": "-40px",
    }),
  },
  {
    set: "violetRose",
    show: "roomy",
    place: css({
      "--spot-x": "calc((100cqw - 46rem) / 4)",
      "--spot-y": "82cqh",
      "--spot-size": "clamp(0px, (100cqw - 46rem) / 2 - 3rem, 96px)",
      "--drift-from": "30px",
      "--drift-to": "-30px",
    }),
  },
  {
    set: "skyTeal",
    show: "phone",
    place: css({ "--spot-x": "calc(50cqw - 8.5rem)", "--spot-y": "21rem", "--spot-size": "36px" }),
  },
];

/** Two more from 64rem, and one each side of the calls to action when stacked. */
const MEDIUM: readonly BubbleSpot[] = [
  {
    set: "skyTeal",
    show: "wide",
    place: css({
      "--spot-x": "calc(max(1.5rem, (100cqw - 76rem) / 2) * 0.3)",
      "--spot-y": "24cqh",
      "--spot-size": "clamp(0px, max(1.5rem, (100cqw - 76rem) / 2) * 0.5, 120px)",
      "--drift-from": "50px",
      "--drift-to": "-50px",
    }),
  },
  {
    set: "violetRose",
    show: "wide",
    place: css({
      "--spot-x": "calc(max(1.5rem, (100cqw - 76rem) / 2) + 30rem)",
      "--spot-y": "92cqh",
      "--spot-size": "44px",
      "--drift-from": "90px",
      "--drift-to": "-90px",
    }),
  },
  {
    set: "skyTeal",
    show: "stacked",
    place: css({ "--spot-x": "calc(50cqw - 20rem)", "--spot-y": "11rem", "--spot-size": "64px" }),
  },
  {
    set: "violetRose",
    show: "stacked",
    place: css({ "--spot-x": "calc(50cqw + 17rem)", "--spot-y": "15rem", "--spot-size": "44px" }),
  },
  {
    set: "violetRose",
    show: "phone",
    place: css({ "--spot-x": "calc(50cqw + 8rem)", "--spot-y": "20.25rem", "--spot-size": "26px" }),
  },
];

/** Three more small ones from 64rem: above the dashboard, between the columns and under it. */
const FULLER: readonly BubbleSpot[] = [
  {
    set: "violetRose",
    show: "wide",
    place: css({
      "--spot-x": "calc(100cqw - max(1.5rem, (100cqw - 76rem) / 2) - 9rem)",
      "--spot-y": "5cqh",
      "--spot-size": "44px",
      "--drift-from": "70px",
      "--drift-to": "-70px",
    }),
  },
  {
    set: "skyTeal",
    show: "wide",
    place: css({
      "--spot-x": "calc(max(1.5rem, (100cqw - 76rem) / 2) + 33rem)",
      "--spot-y": "20cqh",
      "--spot-size": "36px",
      "--drift-from": "100px",
      "--drift-to": "-100px",
    }),
  },
  {
    set: "skyTeal",
    show: "wide",
    place: css({
      "--spot-x": "calc(100cqw - max(1.5rem, (100cqw - 76rem) / 2) - 6rem)",
      "--spot-y": "96cqh",
      "--spot-size": "40px",
      "--drift-from": "80px",
      "--drift-to": "-80px",
    }),
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
