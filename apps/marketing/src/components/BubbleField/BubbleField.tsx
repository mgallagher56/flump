import type { FC } from "react";
import { bubble, field } from "./BubbleField.styles";

type BubbleSpec = {
  readonly set: "skyTeal" | "violetRose";
  readonly size: "lg" | "md" | "sm";
  readonly side: "left" | "right";
  /** `top` and `bottom` sit in the band's padding; `upper` and `lower` in the side gutter. */
  readonly edge: "top" | "bottom" | "upper" | "lower";
};

export type BubbleLayout = "a" | "b" | "c";

/**
 * Three hand-placed layouts, so neighbouring bands differ. Both orb sets in each (the home page
 * shows both bubble sets together). Large and medium bubbles sit in the side gutters only, small
 * ones in a band's top or bottom padding.
 */
export const BUBBLE_LAYOUTS: Record<BubbleLayout, readonly BubbleSpec[]> = {
  a: [
    { set: "skyTeal", size: "lg", side: "right", edge: "upper" },
    { set: "violetRose", size: "md", side: "left", edge: "lower" },
    { set: "skyTeal", size: "sm", side: "left", edge: "top" },
  ],
  b: [
    { set: "violetRose", size: "lg", side: "left", edge: "lower" },
    { set: "skyTeal", size: "md", side: "right", edge: "upper" },
    { set: "violetRose", size: "sm", side: "right", edge: "bottom" },
  ],
  c: [
    { set: "skyTeal", size: "md", side: "right", edge: "lower" },
    { set: "violetRose", size: "sm", side: "left", edge: "top" },
  ],
};

export interface BubbleFieldProps {
  layout?: BubbleLayout;
}

/**
 * The bubble field (ROLLOUT-PLAN building blocks): soft spheres drifting behind a band's content,
 * CSS only. Decoration: hidden from assistive technology. Put it first inside a positioned band.
 * The server render is the still field; the drift needs no script.
 */
export const BubbleField: FC<BubbleFieldProps> = ({ layout = "a" }) => (
  <div aria-hidden="true" className={field} data-bubble-field={layout}>
    {BUBBLE_LAYOUTS[layout].map((spec) => (
      <span
        className={bubble(spec)}
        data-bubble-size={spec.size}
        key={`${spec.size}-${spec.side}-${spec.edge}`}
      />
    ))}
  </div>
);
