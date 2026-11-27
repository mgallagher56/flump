import { restShare } from "./journeyRoute";
import type { NumberSource } from "./seededRandom";

/*
 * Where the journey scene puts things (prototype 11's `journeyScene.ts`): the camera's lane for a
 * stage size, the floor lattice and the motes, the route's waypoints, the beads along it, the
 * bubbles beside each stop and the stops' scroll anchors. Plain numbers in, plain numbers out: no
 * three.js and no DOM, so each is tested on its own. `journeyScene.ts` turns them into meshes.
 */

/** A point as [x, y, z] in world units. */
export type Vec3 = readonly [number, number, number];

export const FOV = 35;
/** tan(FOV / 2): half the screen's height at one unit's depth. */
export const TAN = Math.tan((FOV * Math.PI) / 360);
/** World depth between stops. */
const GAP = 15;
/** How far behind the orb the camera rides. */
export const DIST = 11;
/** How much of the orb's sideways travel the camera follows. */
export const FOLLOW = 0.6;
/** Journey progress where the route starts, before the first stop. */
export const START_S = -1.4;
/** The floor's height. */
export const FLOOR_Y = -2.8;
/** Below this stage width the scene uses its phone lane. */
const PHONE_WIDTH = 768;

/** Journey progress where the route ends, after the last of `stopCount` stops. */
export const journeyEnd = (stopCount: number) => stopCount - 1 + 1.8;
/** The nearest depth the floor and motes reach (behind the camera at the start). */
export const NEAR_Z = GAP * 2;
/** The farthest depth the floor and motes reach, past the route's end. */
export const farZ = (stopCount: number) => -(stopCount + 2) * GAP;

/** The camera's lane for a stage size: the orb's size and height, and how far the route swings. */
export interface Lane {
  readonly aspect: number;
  readonly phone: boolean;
  /** The orb's radius in world units. */
  readonly orbR: number;
  /** The camera's height above the orb's top. */
  readonly camH: number;
  /** How far each stop's waypoint sits to the side of the middle. */
  readonly amplitude: number;
}

/**
 * The lane for a `width` by `height` stage, or null for an empty stage. The orb sits in a band at
 * the bottom of the screen, under the content (MK8): an eighth of the height on a phone, else 130px
 * as a share of the height, held to 11% to 17%. Its radius is 38px on a phone, else half the band,
 * at most 66px. The route swings the orb across 40% of the half width (42% on a phone).
 */
export function laneFor(width: number, height: number): Lane | null {
  if (!width || !height) return null;
  const aspect = width / height;
  const phone = width < PHONE_WIDTH;
  const halfH = DIST * TAN;
  const laneShare = phone ? 0.125 : Math.min(0.17, Math.max(0.11, 130 / height));
  const radiusPx = phone ? 38 : Math.min(66, laneShare * height * 0.5);
  return {
    aspect,
    phone,
    orbR: (radiusPx / (height / 2)) * halfH,
    camH: (1 - laneShare * 2) * halfH,
    amplitude: Math.max(1.4, ((phone ? 0.42 : 0.4) * halfH * aspect) / (1 - FOLLOW)),
  };
}

/** The floor lattice: points 1.1 apart from x -24 to 24, from `zNear` to 20 past `zFar`. */
export function floorLattice(
  zNear: number,
  zFar: number,
  floorY: number,
  random: NumberSource,
): { positions: number[]; seeds: number[] } {
  const positions: number[] = [];
  const seeds: number[] = [];
  for (let z = zNear; z >= zFar - 20; z -= 1.1) {
    for (let x = -24; x <= 24; x += 1.1) {
      positions.push(x, floorY, z);
      seeds.push(random());
    }
  }
  return { positions, seeds };
}

/** The motes: `count` points 30 wide, up to 1.6 above the floor, from `zNear` to `zFar`. */
export function moteField(
  count: number,
  floorY: number,
  zNear: number,
  zFar: number,
  random: NumberSource,
): { positions: number[]; seeds: number[]; toneIds: number[] } {
  const positions: number[] = [];
  const seeds: number[] = [];
  const toneIds: number[] = [];
  for (let i = 0; i < count; i += 1) {
    positions.push(
      (random() - 0.5) * 30,
      floorY + random() * 1.6,
      zNear - random() * (zNear - zFar),
    );
    seeds.push(random());
    toneIds.push(i % 4);
  }
  return { positions, seeds, toneIds };
}

/**
 * The route's waypoints: the start in the middle, each stop's out to alternate sides (the first
 * to the left), a third of a gap past its depth, then the end in the middle.
 */
export function routeWaypoints(stopCount: number, amplitude: number, floorY: number): Vec3[] {
  const points: Vec3[] = [[0, floorY, -START_S * GAP]];
  for (let k = 0; k < stopCount; k += 1) {
    points.push([stopSide(k) * amplitude, floorY, stopDepth(k)]);
  }
  points.push([0, floorY, -journeyEnd(stopCount) * GAP]);
  return points;
}

/** The side stop `k` sits on: -1 left for the first and every other, 1 right. */
export const stopSide = (k: number) => (k % 2 === 0 ? -1 : 1);
/** Stop `k`'s waypoint depth. */
export const stopDepth = (k: number) => -(k + 0.3) * GAP;

/**
 * The route distance nearest a point, by sampling the route at `samples` + 1 even steps:
 * `distanceSqAt(u)` is the squared distance from the point to the route at share `u`. The first
 * nearest sample wins a tie.
 */
export function nearestAlong(
  distanceSqAt: (u: number) => number,
  length: number,
  samples = 800,
): number {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= samples; i += 1) {
    const d = distanceSqAt(i / samples);
    if (d < bestD) {
      bestD = d;
      best = (i / samples) * length;
    }
  }
  return best;
}

/** The beads' route distances: every `step` from the start, short of `length`, at most `max`. */
export function beadDistances(length: number, step: number, max: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < length && out.length < max; d += step) out.push(d);
  return out;
}

/** A glass bubble beside a stop. */
export interface BubbleSpot {
  readonly p: Vec3;
  readonly r: number;
  readonly stop: number;
  /** Its drift's phase, 0 to 2π. */
  readonly seed: number;
  /** In the stop's accent colour, else its own. */
  readonly accent: boolean;
}

/**
 * Each stop's six bubbles: [edge side, share of half width, height above floor, depth behind,
 * radius, accent]. Out at both edges of the screen as the camera passes, behind the stop, never
 * mid-screen.
 */
const BUBBLE_SET: readonly (readonly [number, number, number, number, number, boolean])[] = [
  [1, 0.78, 2.1, 3, 0.55, false],
  [1, 1.02, 3.4, 6, 0.4, true],
  [1, 0.66, 4.4, 4.5, 0.24, true],
  [-1, 0.82, 3.0, 4, 0.48, true],
  [-1, 1.05, 1.6, 6.5, 0.62, false],
  [-1, 0.7, 4.2, 5.5, 0.22, false],
];

/** The bubbles for every stop. On a phone they sit a little in, higher, and are smaller. */
export function bubbleField(
  stopCount: number,
  lane: Pick<Lane, "amplitude" | "aspect" | "phone">,
  floorY: number,
  random: NumberSource,
): BubbleSpot[] {
  const out: BubbleSpot[] = [];
  const { amplitude, aspect, phone } = lane;
  for (let k = 0; k < stopCount; k += 1) {
    const side = stopSide(k);
    const wx = side * amplitude;
    const wz = stopDepth(k);
    for (const [edge, share, up, back, r, accent] of BUBBLE_SET) {
      const half = (DIST + back) * TAN * aspect;
      out.push({
        p: [
          wx * FOLLOW + edge * side * half * share * (phone ? 0.9 : 1),
          floorY + up * (phone ? 1.25 : 1),
          wz - back,
        ],
        r: r * (phone ? 0.6 : 1),
        stop: k,
        seed: random() * Math.PI * 2,
        accent,
      });
    }
  }
  return out;
}

/** A CSS length as a number of pixels, 0 when missing or not a number ("auto"). */
export const cssPixels = (value: string | undefined) => Number.parseFloat(value ?? "") || 0;

/** One stop as measured on the page. */
export interface StopMeasure {
  /** The stop's top on the page (scroll position of its top edge). */
  readonly top: number;
  /** Its frame's sticky `top`, 0 without a frame. */
  readonly stickyTop: number;
  /** The beat before its frame holds: its frame's negative top margin, as a positive height. */
  readonly beat: number;
}

/**
 * The scroll anchors and each stop's rest share. A stop's anchor is where its frame starts to
 * hold (its top less its sticky top); one more anchor sits a unit before the first and one a unit
 * after the last, the unit being the first stop's span (or the viewport height with one stop).
 * With no stops the anchors are a unit before the journey's top and the top itself.
 */
export function journeyAnchors(
  stops: readonly StopMeasure[],
  journeyTop: number,
  viewportHeight: number,
): { anchors: number[]; restShares: number[] } {
  const rows = stops.map((stop) => ({ start: stop.top - stop.stickyTop, beat: stop.beat }));
  const first = rows[0]?.start ?? journeyTop;
  const unit = Math.max(1, (rows[1]?.start ?? first + viewportHeight) - first);
  const restShares = rows.map((row, i) => {
    const span = Math.max(1, (rows[i + 1]?.start ?? row.start + unit) - row.start);
    return restShare(span, row.beat);
  });
  const starts = rows.map((row) => row.start);
  const before = first - unit;
  return { anchors: [before, ...starts, (starts.at(-1) ?? before) + unit], restShares };
}
