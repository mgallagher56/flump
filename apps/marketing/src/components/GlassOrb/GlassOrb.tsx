import { cx } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { glassOrb, orbDot } from "./GlassOrb.styles";

/** The four orb colours (STYLE-GUIDE 2.7): set A sky and teal, set B violet and rose. */
export type OrbTone = "sky" | "teal" | "violet" | "rose";

export const ORB_TONES: readonly OrbTone[] = ["sky", "violet", "teal", "rose"];

export interface GlassOrbProps {
  tone: OrbTone;
  /** A fixed size. Leave it out when `className` sets `--orb-size` (for example per breakpoint). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Places the orb (position, `--orb-size`). */
  className?: string;
}

/**
 * A still glass orb in CSS, the page's one image family in 2D: the journey's still layer, and
 * any page that wants an orb where the three.js scene does not run (MK11). Decoration only,
 * always hidden from assistive technology. Its colour is its `color`, read back by the live
 * scene as the orb token's computed value (`data-orb-tone`).
 */
export const GlassOrb: FC<GlassOrbProps> = ({ tone, size, className }) => (
  <span
    aria-hidden="true"
    className={cx(glassOrb({ tone, size }), className)}
    data-glass-orb=""
    data-orb-tone={tone}
  />
);

/** A small dot in one orb colour, such as the journey kicker's. Hidden from assistive technology. */
export const OrbDot: FC<{ tone: OrbTone; className?: string }> = ({ tone, className }) => (
  <span aria-hidden="true" className={cx(orbDot({ tone }), className)} data-orb-dot={tone} />
);
