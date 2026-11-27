import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { BUBBLE_PLACES, bubble, field } from "./BubbleField.styles";

export type BubbleLayout = "a" | "b" | "c";

/** Which orb colour sets the field uses: both (alternating, as on the home page) or one. */
export type BubbleSets = "both" | "skyTeal" | "violetRose";

/**
 * Where the field sits, which decides what a narrow screen keeps (prototype 11):
 * - `band`: under 56rem only the large edge bubble stays, smaller and pushed to its edge;
 * - `hero`: as `band`, and the field starts 40% down so the bubble clears the heading;
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

export interface BubbleFieldProps {
  layout?: BubbleLayout;
  sets?: BubbleSets;
  fit?: BubbleFit;
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
}) => (
  <div aria-hidden="true" className={field({ fit })} data-bubble-field={layout}>
    {BUBBLE_LAYOUTS[layout].map((spec, index) => (
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
