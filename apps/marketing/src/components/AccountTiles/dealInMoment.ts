import type { GsapKit } from "../../motion/loadGsapKit";
import { MOMENT_START, type MomentTimeline } from "../../motion/moments/arrive";
import { figureFormat } from "../CountUpFigure/figureFormats";

/*
 * The accounts deal (STYLE-GUIDE 11.2; prototype 11's `buildAccounts`), in arrive units: the six
 * cards are dealt one by one from a pile at the deck's centre to their places, each with the
 * prototype's small turn and scale, on the calm in-out ease, and the net worth counts through the
 * running total as each card lands (what you have adds, what you owe takes away), ending on its
 * value. The last card lands before the stop rests.
 *
 * Rule conflict for the owner: MK4 says entrances move by distance and opacity only; the approved
 * prototype turns each card by up to 3 degrees and scales it from 0.97. Built as the prototype.
 */

/** Units between one card and the next. */
const STEP = 0.26;
/** Units after a card starts that its running total begins to count. */
const COUNT_LAG = 0.25;

export function dealInMoment(_kit: GsapKit, tl: MomentTimeline, root: HTMLElement): Element[] {
  const deck = root.querySelector<HTMLElement>("[data-deck]");
  if (!deck) return [];
  const cards = Array.from(deck.querySelectorAll<HTMLElement>("[data-deal]"));
  const figure = root.querySelector<HTMLElement>("[data-count]");
  const format = figureFormat(figure?.dataset.format);
  const proxy = { v: Number(figure?.dataset.countFrom ?? 0) };
  let last = "";
  const write = () => {
    if (!figure) return;
    const text = format(proxy.v);
    if (text !== last) {
      last = text;
      figure.textContent = text;
    }
  };
  let running = proxy.v;
  const middle = (cards.length - 1) / 2;
  cards.forEach((card, i) => {
    tl.fromTo(
      card,
      {
        x: () => deck.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
        y: () => deck.clientHeight / 2 - (card.offsetTop + card.offsetHeight / 2) - i * 3,
        rotation: (i - middle) * 1.2,
        scale: 0.97,
        opacity: i === 0 ? 1 : 0.9,
      },
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: 0.7,
        ease: "calmInOut",
        immediateRender: true,
      },
      MOMENT_START + i * STEP,
    );
    running += Number(card.dataset.signed ?? 0);
    // The last card's total is the figure's own value, so the count always ends on what it says.
    const total = i === cards.length - 1 && figure ? Number(figure.dataset.count) : running;
    tl.to(
      proxy,
      { v: total, duration: 0.5, ease: "calm", onUpdate: write, onComplete: write },
      MOMENT_START + COUNT_LAG + i * STEP,
    );
  });
  write();
  return cards;
}
