/*
 * The pure parts of the journey scene (prototype 11's `journeyScene.ts`): how far along the
 * journey the reader is, where on the route the orb is, and which of the stops' colours it is
 * between. No three.js and no DOM, so they are tested on their own.
 *
 * Journey progress `s`: s = k at the start of stop k's rest (its frame starting to hold), counting
 * from 0; below 0 before the first stop.
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Smoothstep on 0 to 1: eases in and out, with no overshoot. */
export const smooth = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};

/**
 * Journey progress at scroll `y`. `anchors` are scroll positions: one before the first stop, one
 * per stop (where its rest starts), one after the last. Before the first anchor it is -1.
 */
export function progressFromScroll(y: number, anchors: readonly number[]): number {
  const n = anchors.length - 1;
  if (n < 1) return 0;
  if (y <= (anchors[0] ?? 0)) return -1;
  for (let i = 0; i < n; i += 1) {
    const a = anchors[i] ?? 0;
    const b = anchors[i + 1] ?? a + 1;
    if (y < b) return i - 1 + (y - a) / Math.max(1, b - a);
  }
  return n - 1;
}

/** Piecewise linear from `xs` to `ys` (both rising), held at the ends. */
export function piecewise(x: number, xs: readonly number[], ys: readonly number[]): number {
  const count = Math.min(xs.length, ys.length);
  if (count === 0) return 0;
  if (x <= (xs[0] ?? 0)) return ys[0] ?? 0;
  for (let i = 0; i < count - 1; i += 1) {
    const a = xs[i] ?? 0;
    const b = xs[i + 1] ?? a;
    if (x < b) {
      const from = ys[i] ?? 0;
      const to = ys[i + 1] ?? from;
      return from + (to - from) * ((x - a) / Math.max(1e-4, b - a));
    }
  }
  return ys[count - 1] ?? 0;
}

/** A stop's rest as a share of the scroll to the next stop: the span less the beat, 0.15 to 0.8. */
export const restShare = (span: number, beat: number) =>
  Math.min(0.8, Math.max(0.15, (span - beat) / Math.max(1, span)));

/**
 * The journey progress of each route waypoint: the start, each stop's (the middle of its rest,
 * where the orb rolls through the turn below the resting pair) and the end.
 */
export function waypointProgress(
  restShares: readonly number[],
  start: number,
  end: number,
): number[] {
  return [start, ...restShares.map((share, k) => k + share * 0.5), end];
}

/** One of a stop's two orb colours: 0 its own, 1 its accent. */
export interface ToneRef {
  readonly stop: number;
  readonly role: 0 | 1;
}

/**
 * The orb's colour at progress `s`, as a mix between two stop colours: stop k's own colour on
 * arrival, turning to its accent through the rest, then to the next stop's own colour through the
 * travel (the last stop keeps its accent).
 */
export function colourMixAt(
  s: number,
  restShares: readonly number[],
  stopCount: number,
): { from: ToneRef; to: ToneRef; t: number } {
  const lastStop = Math.max(0, stopCount - 1);
  const k = Math.floor(s);
  if (k < 0) return { from: { stop: 0, role: 0 }, to: { stop: 0, role: 0 }, t: 0 };
  const stop = Math.min(lastStop, k);
  const f = s - k;
  const share = restShares[stop] ?? 0.5;
  if (k <= lastStop && f < share) {
    return {
      from: { stop, role: 0 },
      to: { stop, role: 1 },
      t: smooth((f - 0.1) / (share - 0.05)),
    };
  }
  const to: ToneRef = k + 1 <= lastStop ? { stop: k + 1, role: 0 } : { stop, role: 1 };
  return {
    from: { stop, role: 1 },
    to,
    t: k > lastStop ? 1 : smooth((f - share) / (1 - share)),
  };
}
