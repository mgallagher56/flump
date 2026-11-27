import type { OrbToneName } from "../../p11/journeyTypes";
import type { OrbLayout } from "./orbScene";

/*
 * Where the orbs sit, per page shape. Every layout keeps orbs away from text: beside the copy on
 * wide screens, on a shelf under the calls to action on phones (the hero band leaves room for it),
 * and wholly inside the stage, so no orb is cut by an edge.
 */

type Four = readonly [OrbToneName, OrbToneName, OrbToneName, OrbToneName];

const clampD = (d: number, max: number) => Math.round(Math.min(d, max));

/** A hero band: copy on the left, orbs on the right; on phones a row on the shelf below. */
export const heroLayout =
  (tones: Four): OrbLayout =>
  (width, height) => {
    const [a, b, c, d] = tones;
    if (width < 768) {
      const y = 1 - 64 / Math.max(height, 1);
      return [
        { x: 0.2, y, d: 84, tone: a },
        { x: 0.47, y: y + 14 / height, d: 46, tone: b },
        { x: 0.74, y: y - 6 / height, d: 96, tone: c },
        { x: 0.93, y: y + 20 / height, d: 30, tone: d },
      ];
    }
    const big = clampD(height * 0.46, 260);
    return [
      { x: width < 1024 ? 0.82 : 0.76, y: 0.46, d: big, tone: a },
      { x: 0.93, y: 0.2, d: clampD(big * 0.42, 110), tone: b },
      { x: width < 1024 ? 0.72 : 0.62, y: 0.8, d: clampD(big * 0.3, 78), tone: c },
      { x: 0.95, y: 0.8, d: clampD(big * 0.18, 46), tone: d },
    ];
  };

/** The whole-page canvas (S2): orbs in the side gutters, small at the edges on phones. */
export const pageLayout =
  (tones: Four): OrbLayout =>
  (width) => {
    const [a, b, c, d] = tones;
    if (width < 768) {
      return [
        { x: 0.1, y: 0.3, d: 56, tone: a },
        { x: 0.9, y: 0.14, d: 40, tone: b },
        { x: 0.88, y: 0.66, d: 64, tone: c },
        { x: 0.1, y: 0.86, d: 34, tone: d },
      ];
    }
    // The margin beside the 72rem content column; orbs stay inside it so none sits behind a heading.
    const margin = Math.max(0, (width - 1152) / 2);
    const big = clampD(margin * 0.85, 170);
    const small = clampD(margin * 0.55, 110);
    const left = Math.max(big / 2 + 8, margin / 2) / width;
    const right = 1 - left;
    if (big < 48) {
      // No real margin (under about 1250px): orbs at the very edges, as on phones.
      return [
        { x: 0.04, y: 0.3, d: 64, tone: a },
        { x: 0.96, y: 0.16, d: 48, tone: b },
        { x: 0.95, y: 0.7, d: 72, tone: c },
        { x: 0.05, y: 0.86, d: 40, tone: d },
      ];
    }
    return [
      { x: left, y: 0.32, d: big, tone: a },
      { x: right, y: 0.18, d: small, tone: b },
      { x: right, y: 0.7, d: big, tone: c },
      { x: left, y: 0.86, d: small, tone: d },
    ];
  };

/**
 * The legal header band: orbs in the margins beside the reading column on wide screens; on phones
 * two small ones in the band's top padding, above the title.
 */
export const legalLayout =
  (tones: Four): OrbLayout =>
  (width, height) => {
    const [a, b, c] = tones;
    if (width < 900) {
      const y = 26 / Math.max(height, 1);
      return [
        { x: 1 - 64 / width, y, d: 34, tone: a },
        { x: 1 - 30 / width, y: y + 6 / height, d: 20, tone: b },
      ];
    }
    const column = 768;
    const margin = (width - column) / 2;
    const left = Math.max(70, margin * 0.5) / width;
    return [
      { x: left, y: 0.42, d: clampD(margin * 0.62, 150), tone: a },
      { x: 1 - left, y: 0.3, d: clampD(margin * 0.42, 100), tone: b },
      { x: 1 - left * 0.7, y: 0.78, d: clampD(margin * 0.24, 56), tone: c },
    ];
  };
