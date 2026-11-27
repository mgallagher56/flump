/*
 * The journey's rail, as pure geometry (no three.js, no DOM), so it can be tested. Units are CSS
 * pixels. The rail is the narrow column beside the stops: the orb and its bead track live only in
 * it, so neither ever crosses a card, a heading or text (MK8). x is measured from the rail's centre
 * line; y from the rail's top, downwards.
 */

/** How far every part of the orb (and its soft glow) stays inside the rail's edges. */
export const EDGE_INSET = 8;
/** Where the orb rests in the visible part of the stage while the journey scrolls by: the reading line. */
const READING_LINE = 0.4;

export interface RailMetrics {
  readonly orbRadius: number;
  /** How far the track swings either side of the centre line. Zero on a phone's slim rail. */
  readonly amplitude: number;
  readonly beadRadius: number;
  /** Distance between beads along the rail. */
  readonly beadStep: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Smoothstep: 0 at or below 0, 1 at or above 1, eased in between. */
const smooth = (v: number) => {
  const c = clamp(v, 0, 1);
  return c * c * (3 - 2 * c);
};

/**
 * The orb's size and the track's swing for a rail `width` wide. The orb and its glow (1.1 radius)
 * always fit inside the rail with `EDGE_INSET` to spare at the track's widest point, so the orb is
 * never cut by an edge at any width.
 */
export function railMetrics(width: number): RailMetrics {
  const half = Math.max(0, width / 2 - EDGE_INSET);
  const orbRadius = clamp(width * 0.2, 6, Math.min(40, half / 1.1));
  const amplitude = Math.max(0, half - orbRadius * 1.1);
  const beadRadius = clamp(width * 0.016, 1.5, 3);
  return { orbRadius, amplitude, beadRadius, beadStep: beadRadius * 6 };
}

/** Which side of the centre line stop `k`'s waypoint sits: left, right, left... */
const side = (k: number) => (k % 2 === 0 ? -1 : 1);

/**
 * The track's x at rail height `y`: it sits at one side at each stop's anchor and crosses smoothly
 * to the other side between stops. Before the first anchor and after the last it holds its side.
 */
export function trackX(y: number, anchors: readonly number[], amplitude: number): number {
  if (anchors.length === 0 || amplitude === 0) return 0;
  const first = anchors[0] as number;
  if (y <= first) return side(0) * amplitude;
  for (let k = 0; k < anchors.length - 1; k += 1) {
    const a = anchors[k] as number;
    const b = anchors[k + 1] as number;
    if (y < b) {
      const t = smooth((y - a) / Math.max(1, b - a));
      return (side(k) + (side(k + 1) - side(k)) * t) * amplitude;
    }
  }
  return side(anchors.length - 1) * amplitude;
}

/** Between which stops `y` lies, and how far along: drives the orb's and a bead's colour. */
export function stopBlend(
  y: number,
  anchors: readonly number[],
): { from: number; to: number; t: number } {
  const last = Math.max(0, anchors.length - 1);
  if (anchors.length < 2 || y <= (anchors[0] as number)) return { from: 0, to: 0, t: 0 };
  for (let k = 0; k < last; k += 1) {
    const a = anchors[k] as number;
    const b = anchors[k + 1] as number;
    if (y < b) return { from: k, to: k + 1, t: smooth((y - a) / Math.max(1, b - a)) };
  }
  return { from: last, to: last, t: 0 };
}

/**
 * Keeps every anchor where the whole orb fits inside the rail (`EDGE_INSET` from the top and the
 * bottom), so the first and last stops never push the orb past an edge.
 */
export function clampAnchors(
  anchors: readonly number[],
  railHeight: number,
  orbRadius: number,
): number[] {
  const lo = orbRadius * 1.1 + EDGE_INSET;
  const hi = Math.max(lo, railHeight - lo);
  return anchors.map((a) => clamp(a, lo, hi));
}

export interface OrbPlacementInput {
  /** The stage's top, in rail coordinates (the stage is sticky inside the rail). */
  readonly stageTop: number;
  readonly stageHeight: number;
  /** The part of the stage the visitor can see, from its top (below the sticky header). */
  readonly visibleTop: number;
  readonly anchors: readonly number[];
  readonly orbRadius: number;
}

/**
 * Where the orb heads: the reading line of the visible stage, held between the first and the last
 * stop, and always wholly inside the visible stage, so it is never cut by the stage's edge or hidden
 * under the header.
 */
export function orbTargetY({
  stageTop,
  stageHeight,
  visibleTop,
  anchors,
  orbRadius,
}: OrbPlacementInput): number {
  const top = stageTop + visibleTop;
  const height = Math.max(0, stageHeight - visibleTop);
  const reading = top + height * READING_LINE;
  const first = anchors[0] ?? reading;
  const last = anchors.at(-1) ?? reading;
  const along = clamp(reading, first, last);
  const room = orbRadius * 1.1 + EDGE_INSET;
  return clamp(along, top + room, Math.max(top + room, top + height - room));
}

/**
 * A bead's size near the stage's top and bottom edges: it shrinks to nothing over `fade` pixels,
 * so beads leave the stage softly instead of being cut by its edge.
 */
export function edgeFade(yInStage: number, stageHeight: number, fade = 24): number {
  return smooth(yInStage / fade) * smooth((stageHeight - yInStage) / fade);
}

/** The bead positions along the track between the first and the last stop. */
export function beadPositions(
  anchors: readonly number[],
  metrics: RailMetrics,
): { x: number; y: number }[] {
  const first = anchors[0];
  const last = anchors.at(-1);
  if (first === undefined || last === undefined || last <= first) return [];
  const out: { x: number; y: number }[] = [];
  for (let y = first; y <= last; y += metrics.beadStep) {
    out.push({ x: trackX(y, anchors, metrics.amplitude), y });
  }
  return out;
}

/** An exponential approach that reaches about 63% of the way in `seconds`: frame-rate independent. */
export const approach = (dt: number, seconds: number) =>
  1 - Math.exp(-dt / Math.max(1e-3, seconds));
