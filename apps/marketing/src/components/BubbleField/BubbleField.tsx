import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { BUBBLE_PLACES, bubble, field, spot } from "./BubbleField.styles";

export type BubbleLayout = "a" | "b" | "c";

/** Which orb colour sets the field uses: both (alternating, as on the home page) or one. */
export type BubbleSets = "both" | "skyTeal" | "violetRose";

/**
 * Where the field sits, which decides what a narrow screen keeps (prototype 11):
 * - `band`: under 56rem only the large edge bubble stays, smaller and pushed to its edge;
 * - `hero`: the home hero's own `spots` instead of a layout. Put it first inside the hero's
 *   centred column (which the hero's pin holds in place, so no bubble moves when the pin is
 *   added); the field reaches out to the window's edges and is a size container, so a spot can be
 *   placed by its width (`cqw`) and height (`cqh`);
 * - `beside`: as `band`, and the small upper bubble is never shown, since beside a second list or
 *   in the close it would sit on the heading;
 * - `sample`: behind a journey sample, a little past its box, all three bubbles at every width.
 */
export type BubbleFit = "band" | "hero" | "beside" | "sample";

type BubbleSpec = {
  /** Diameter in px, as prototype 11. */
  readonly size: number;
  /** How far it drifts each way as the band scrolls through the screen, in px. */
  readonly travel: number;
};

/**
 * Prototype 11's three hand-placed layouts (`Bubbles` in its round three kit): one large bubble
 * at an edge, a medium one and a small one. The large bubble may run past the screen's edge, as in
 * the prototype; the page shell clips sideways overflow, so the page never scrolls sideways.
 * Places are in `BubbleField.styles.ts` (`BUBBLE_PLACES`).
 */
export const BUBBLE_LAYOUTS: Record<BubbleLayout, readonly BubbleSpec[]> = {
  a: [
    { size: 260, travel: 24 },
    { size: 120, travel: 60 },
    { size: 70, travel: 100 },
  ],
  b: [
    { size: 300, travel: 24 },
    { size: 96, travel: 60 },
    { size: 54, travel: 100 },
  ],
  c: [
    { size: 180, travel: 30 },
    { size: 80, travel: 80 },
  ],
};

const ORDER = ["first", "second", "third"] as const;

/** With both sets, the first and third bubbles are sky and teal, the second violet and rose. */
const setFor = (sets: BubbleSets, index: number) =>
  sets === "both" ? (index % 2 === 0 ? "skyTeal" : "violetRose") : sets;

/**
 * A bubble placed by a page's own table rather than a prototype layout (the home hero; owner,
 * 28 Nov 2026). It shows at one range of widths, where its place puts it.
 */
export interface BubbleSpot {
  readonly set: "skyTeal" | "violetRose";
  /**
   * `wide`: from 64rem (two columns); `stacked`: 40 to 64rem; `roomy`: 60 to 64rem, where there is
   * room beside the stacked dashboard; `phone`: under 40rem.
   */
  readonly show: "wide" | "stacked" | "roomy" | "phone";
  /**
   * A Panda class setting `--spot-x` and `--spot-y` (its centre), `--spot-size` (its diameter) and
   * optionally `--drift-from` and `--drift-to`, all CSS lengths.
   */
  readonly place: string;
}

export interface BubbleFieldProps {
  layout?: BubbleLayout;
  sets?: BubbleSets;
  fit?: BubbleFit;
  /** Bubbles placed by the page instead of the layout (with `fit="hero"`). */
  spots?: readonly BubbleSpot[];
}

/**
 * The bubble field (STYLE-GUIDE 2.7): soft spheres in the orb colour sets at a band's edges, behind
 * its content. Decoration: hidden from assistive technology, and it takes no space or pointer. Put
 * it first inside a positioned band. The server render is the still field. Where the browser can
 * tie an animation to scroll, each bubble drifts a little as its band passes through the screen,
 * the far bubble least (prototype 11); with reduced motion, or while the visitor has paused
 * animation, it stays still.
 */
export const BubbleField: FC<BubbleFieldProps> = ({
  layout = "a",
  sets = "both",
  fit = "band",
  spots,
}) => (
  <div aria-hidden="true" className={field({ fit })} data-bubble-field={spots ? "spots" : layout}>
    {spots?.map((s) => (
      <span
        className={cx(bubble({ set: s.set }), spot({ show: s.show }), s.place)}
        data-bubble-set={s.set}
        data-bubble-show={s.show}
        key={s.place}
      />
    ))}
    {spots
      ? null
      : BUBBLE_LAYOUTS[layout].map((spec, index) => (
          <span
            className={cx(
              bubble({ set: setFor(sets, index), order: ORDER[index] ?? "third" }),
              BUBBLE_PLACES[layout][index],
            )}
            data-bubble-set={setFor(sets, index)}
            data-bubble-size={spec.size}
            key={`${layout}-${spec.size}`}
          />
        ))}
  </div>
);
