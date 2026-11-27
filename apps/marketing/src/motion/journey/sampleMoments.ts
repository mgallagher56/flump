import { marketingMs } from "@repo/ui";
import type { GsapKit } from "../loadGsapKit";

/*
 * Each journey sample's own moment, added to its stop's arrive timeline (`JourneyStop`): cards
 * dealt into place, the budget bar filling, the payslip opening, a line drawing itself, the Home
 * page's tiles arriving. Ported from prototype 11's `stops/visuals.tsx` builders.
 *
 * Time completes every moment (MK2): the timeline plays on time once scroll has triggered it and
 * is never scrubbed. Every moment is over before the stop rests, and `JourneyStop` clears the
 * transforms it leaves, so nothing holds a transform at rest (MK3). Moves are by distance and
 * opacity, on the calm eases from the tokens (MK4). Figures are not driven here: the one count-up
 * per sample is `useCountUp` (MK13).
 */

type Timeline = ReturnType<GsapKit["gsap"]["timeline"]>;

/** A marketing duration in seconds, for GSAP. */
export const seconds = (key: Parameters<typeof marketingMs>[0]) => marketingMs(key) / 1000;

/** Adds `root`'s moment to `tl` from `at` seconds. Returns the elements it moves, for clearing. */
export type SampleMoment = (kit: GsapKit, tl: Timeline, root: HTMLElement, at: number) => Element[];

const all = (root: HTMLElement, selector: string) => Array.from(root.querySelectorAll(selector));

/** Accounts: the six cards dealt from one pile at the deck's centre to their places. */
const deal: SampleMoment = (_kit, tl, root, at) => {
  const deck = root.querySelector<HTMLElement>("[data-deck]");
  if (!deck) return [];
  const cards = all(deck, "[data-deal]") as HTMLElement[];
  const step = seconds("stagger");
  cards.forEach((card, i) => {
    tl.fromTo(
      card,
      {
        x: () => deck.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
        y: () => deck.clientHeight / 2 - (card.offsetTop + card.offsetHeight / 2),
        opacity: 0,
      },
      { x: 0, y: 0, opacity: 1, duration: seconds("disclosure"), ease: "calmInOut" },
      at + i * step,
    );
  });
  return cards;
};

/** Budget: each outgoing fills its share of the bar in turn, its line coming up beside it. */
const fillBar: SampleMoment = (_kit, tl, root, at) => {
  const segments = all(root, "[data-bar-segment]");
  const rows = all(root, "[data-budget-row]");
  const left = all(root, "[data-bar-left]");
  const step = seconds("stagger");
  segments.forEach((segment, i) => {
    tl.fromTo(
      segment,
      { scaleX: 0, transformOrigin: "0% 50%" },
      { scaleX: 1, duration: seconds("hover"), ease: "calmInOut" },
      at + i * step,
    );
    const row = rows[i];
    if (row) {
      tl.fromTo(
        row,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: seconds("hover"), ease: "calm" },
        at + i * step,
      );
    }
  });
  tl.fromTo(
    left,
    { opacity: 0 },
    { opacity: 1, duration: seconds("hover"), ease: "calm" },
    at + segments.length * step,
  );
  return [...segments, ...rows, ...left];
};

/** Pay: the payslip, folded in three, opens out: the lower third turns down, then the top up. */
const unfold: SampleMoment = (_kit, tl, root, at) => {
  const bottom = root.querySelector("[data-fold=bottom]");
  const top = root.querySelector("[data-fold=top]");
  const turn = seconds("disclosure");
  if (bottom) {
    tl.fromTo(
      bottom,
      { rotationX: -90, opacity: 0 },
      { rotationX: 0, opacity: 1, duration: turn, ease: "calmInOut" },
      at,
    );
  }
  if (top) {
    tl.fromTo(
      top,
      { rotationX: 90, opacity: 0 },
      { rotationX: 0, opacity: 1, duration: turn, ease: "calmInOut" },
      at + turn * 0.7,
    );
  }
  return [bottom, top].filter((el): el is Element => el !== null);
};

/** Savings and debt: the line draws (its clip widens), then the marker settles on the last point. */
const drawLine: SampleMoment = (_kit, tl, root, at) => {
  const clip = root.querySelector("[data-chart-clip]");
  const marker = root.querySelector("[data-chart-marker]");
  if (!clip) return [];
  const full = Number(clip.getAttribute("width"));
  tl.fromTo(
    clip,
    { attr: { width: 0 } },
    { attr: { width: full }, duration: seconds("chart"), ease: "calmInOut" },
    at,
  );
  if (marker) {
    tl.fromTo(
      marker,
      { opacity: 0 },
      { opacity: 1, duration: seconds("hover"), ease: "calm" },
      at + seconds("chart"),
    );
  }
  return marker ? [marker] : [];
};

/** The picture: the Home page's tiles arrive in turn. */
const tiles: SampleMoment = (_kit, tl, root, at) => {
  const items = all(root, "[data-tile]");
  tl.fromTo(
    items,
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: seconds("entry"),
      ease: "calm",
      stagger: seconds("stagger"),
    },
    at,
  );
  return items;
};

/** Each sample's moment, by the sample's `data-sample` name. */
export const SAMPLE_MOMENTS: Record<string, SampleMoment> = {
  accounts: deal,
  budget: fillBar,
  pay: unfold,
  savings: drawLine,
  debt: drawLine,
  picture: tiles,
};
