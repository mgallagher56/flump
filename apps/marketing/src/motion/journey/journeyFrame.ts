import type { OrbTone } from "../../components/GlassOrb/GlassOrb";
import type { SceneVerdict } from "../../components/SceneStage/SceneStage";
import { clamp01, colourMixAt, piecewise, smooth } from "./journeyRoute";

/*
 * The journey scene's per-frame decisions (prototype 11's `journeyScene.ts`): how softly things
 * follow, where the orb is on the route, which stop colours apply, how the beads, bubbles and stop
 * lights look, the Midnight and Mint material settings, and what the frame rate check and the loop
 * do. Plain numbers in, plain numbers out: no three.js and no DOM, so each is tested on its own.
 */

/** The marketing site's calm pace (prototype 11's timings times 1.4): how gently the orb follows. */
const PACE = 1.4;
/** The longest step one frame takes, in seconds, so a stalled tab does not jump. */
const MAX_STEP = 0.05;
/** The beads' full radius, in world units. */
const BEAD_R = 0.075;

/** Seconds since the last frame, held to `MAX_STEP`; 0 on the first frame (`last` 0). */
export const frameDelta = (now: number, last: number) =>
  last ? Math.min(MAX_STEP, (now - last) / 1000) : 0;

/** The share of the way to its goal a value moves in `dt` seconds at `rate` per second. */
export const easeShare = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

/**
 * The journey progress the orb shows: it follows scroll softly at the calm pace, and jumps
 * straight to it on the first frames (below -1.5) or when `snap` (ambient motion paused).
 */
export const followProgress = (s: number, target: number, dt: number, snap: boolean) =>
  s < -1.5 || snap ? target : s + (target - s) * easeShare(dt, 3.6 / PACE);

/** The camera's lean into a turn: follows the route's sideways heading, at once when `snap`. */
export const followLean = (lean: number, heading: number, dt: number, snap: boolean) =>
  snap ? heading : lean + (heading - lean) * easeShare(dt, 2.5);

/** The share the orb's colour moves toward its goal colour in a frame. */
export const toneShare = (dt: number) => easeShare(dt, 2.2 / PACE);

/** The orb's route distance at progress `s`, held to the route. */
export const routeAlong = (
  s: number,
  waypointS: readonly number[],
  routeAt: readonly number[],
  routeLength: number,
) => Math.max(0, Math.min(routeLength, piecewise(s, waypointS, routeAt)));

/** The orb's share of the route (0 to 1). */
export const routeShare = (along: number, routeLength: number) => clamp01(along / routeLength);

/**
 * How far the orb rolls this frame, in radians: the distance moved over its radius. Nothing on
 * the first frame (`lastAlong` below 0) or after a jump of 3 or more (a resize or a far scroll).
 */
export const rollStep = (along: number, lastAlong: number, orbR: number) =>
  lastAlong >= 0 && Math.abs(along - lastAlong) < 3 ? (along - lastAlong) / orbR : 0;

/** The stop the reader is at or past: 0 before the first, the last after it. */
export const stopIndexAt = (s: number, stopCount: number) =>
  Math.max(0, Math.min(stopCount - 1, Math.floor(s)));

/** Stop `k`'s two colours [own, accent], held to the stops; sky and violet with none. */
export function stopTonesAt(
  stopTones: readonly (readonly [OrbTone, OrbTone])[],
  k: number,
  stopCount: number,
): readonly [OrbTone, OrbTone] {
  return stopTones[Math.max(0, Math.min(stopCount - 1, k))] ?? ["sky", "violet"];
}

/** The orb's colour at progress `s`: a mix from one stop colour to another, `t` of the way. */
export function orbToneAt(
  s: number,
  restShares: readonly number[],
  stopTones: readonly (readonly [OrbTone, OrbTone])[],
  stopCount: number,
): { from: OrbTone; to: OrbTone; t: number } {
  const { from, to, t } = colourMixAt(s, restShares, stopCount);
  return {
    from: stopTonesAt(stopTones, from.stop, stopCount)[from.role],
    to: stopTonesAt(stopTones, to.stop, stopCount)[to.role],
    t,
  };
}

/**
 * The second rim light's colour role at stop `k`: the accent while the stop rests (before its
 * rest share; a half when not measured), then the stop's own.
 */
export const rimRole = (s: number, k: number, restShares: readonly number[]): 0 | 1 =>
  s - k < (restShares[k] ?? 0.5) ? 1 : 0;

/** A stop light's strength: full at its waypoint, gone 0.9 of a stop away. Mint runs brighter. */
export const stopLightIntensity = (s: number, waypoint: number, dark: boolean) =>
  (1 - smooth(Math.abs(s - waypoint) / 0.9)) * (dark ? 22 : 28);

/**
 * A bead's look with the orb at `along`: small ahead (45% of full size), growing to full over the
 * 2.4 before the orb, smaller on a phone; those just passed glow in the orb's colour, fading over
 * about 2.2 behind it. `glow` multiplies the bead's colour; `whiten` is the share mixed to white.
 */
export function beadLook(
  along: number,
  d: number,
  phone: boolean,
  dark: boolean,
): { radius: number; glow: number; whiten: number } {
  const g = smooth((along - d + 2.4) / 2.4);
  const behind = along - d;
  const trail = behind >= 0 ? Math.exp(-behind / 2.2) : 0;
  return {
    radius: BEAD_R * (0.45 + 0.55 * g) * (phone ? 0.85 : 1),
    glow: 1 + trail * (dark ? 1.1 : 1.2),
    whiten: dark ? 0 : 0.08,
  };
}

/**
 * A bubble's rise: its stop's cluster grows from 0.4 before the stop to 0.2 after, drifts up and
 * down by 0.14, and sinks away (0.9 down, scale 0) before the camera reaches it.
 */
export function bubbleRise(
  bubble: { readonly z: number; readonly stop: number; readonly seed: number; readonly r: number },
  cameraZ: number,
  s: number,
  t: number,
): { lift: number; scale: number } {
  const clearance = smooth((cameraZ - bubble.z - 4) / 5);
  const grow = smooth((s - bubble.stop + 0.4) / 0.6) * clearance;
  return {
    lift: Math.sin(t * 0.45 + bubble.seed) * 0.14 - (1 - grow) * 0.9,
    scale: Math.max(1e-4, bubble.r * grow),
  };
}

/** What a frame does with the frame rate check's verdict. */
export type FrameAction = "none" | "downgrade" | "report";

/** A downgrade drops the pixel ratio in place; any other verdict goes to the stage. */
export const frameAction = (verdict: SceneVerdict | null): FrameAction =>
  verdict === null ? "none" : verdict.kind === "downgrade" ? "downgrade" : "report";

/** The loop runs only on screen, with ambient motion on, in a visible tab. */
export const shouldLoop = (state: {
  readonly onScreen: boolean;
  readonly running: boolean;
  readonly hidden: boolean;
}) => state.onScreen && state.running && !state.hidden;

/** Midnight when the canvas colour's relative luminance is under 0.3. */
export const isDarkCanvas = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b < 0.3;

/** The scene's material and light settings, for Midnight (`dark`) or Mint. */
export function sceneLook(dark: boolean) {
  return {
    floorOpacity: dark ? 0.72 : 0.4,
    moteOpacity: dark ? 0.55 : 0.4,
    /** Motes and the orb's shadow add light on Midnight, and darken on Mint. */
    additive: dark,
    /** Midnight: a little diffuse share so the tinted body shows. Mint: nearly clear. */
    glassTransmission: dark ? 0.88 : 0.94,
    glassEnvIntensity: dark ? 1.05 : 0.75,
    glassRoughness: dark ? 0.05 : 0.04,
    orbThickness: dark ? 0.9 : 0.8,
    orbAttenuationDistance: dark ? 0.8 : 1.6,
    beadTransmission: dark ? 0.55 : 0.85,
    orbRim: dark ? 1.2 : 0.8,
    orbGlow: dark ? 0.06 : 0,
    beadRim: dark ? 0.9 : 0.6,
    beadGlow: dark ? 0.14 : 0.04,
    bubbleRim: dark ? 1.0 : 0.7,
    bubbleGlow: dark ? 0.05 : 0,
    keyLight: dark ? 1.3 : 1.8,
    /** The share of a bubble's colour over white. */
    bubbleTint: dark ? 1 : 0.88,
    /** The orb's glass, as shares of its colour over white. */
    orbAttenuationTint: dark ? 0.85 : 0.7,
    orbColourTint: dark ? 0.9 : 0.75,
    orbEmissive: dark ? 0.08 : 0,
    /** The orb's shadow: in its colour on Midnight, in ink on Mint. */
    shadowInOrbTone: dark,
    shadowOpacity: dark ? 0.2 : 0.22,
    rimA: dark ? 12 : 9,
    rimB: dark ? 9 : 6,
  } as const;
}

export type SceneLook = ReturnType<typeof sceneLook>;
