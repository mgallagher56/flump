import type { OrbTone } from "../../components/GlassOrb/GlassOrb";

/** One orb in the hero stage: its centre as a share of the stage, its diameter in CSS pixels. */
export interface OrbPlace {
  readonly x: number;
  readonly y: number;
  readonly d: number;
  readonly tone: OrbTone;
}

type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Where each still orb sits in the stage, from the boxes the browser laid out: the centre as a
 * share of the stage's width and height, the diameter in CSS pixels. A stage with no size, or an
 * orb with none (not laid out), gives nothing for it.
 */
export function placesFromBoxes(
  stage: Box,
  orbs: readonly { readonly box: Box; readonly tone: OrbTone }[],
): OrbPlace[] {
  if (stage.width <= 0 || stage.height <= 0) return [];
  return orbs
    .filter(({ box }) => box.width > 0)
    .map(({ box, tone }) => ({
      x: (box.left + box.width / 2 - stage.left) / stage.width,
      y: (box.top + box.height / 2 - stage.top) / stage.height,
      d: box.width,
      tone,
    }));
}

/** Reads the still orbs (`[data-glass-orb]`) in a stage. */
export function readOrbPlaces(container: HTMLElement): OrbPlace[] {
  const orbs = Array.from(container.querySelectorAll<HTMLElement>("[data-glass-orb]")).map(
    (el) => ({
      box: el.getBoundingClientRect(),
      tone: (el.dataset.orbTone ?? "sky") as OrbTone,
    }),
  );
  return placesFromBoxes(container.getBoundingClientRect(), orbs);
}

/** World units per CSS pixel at the orbs' depth, for a camera `dist` away with half-angle tangent `tan`. */
export const worldPerPixel = (stageHeight: number, dist: number, tan: number) =>
  (2 * dist * tan) / Math.max(1, stageHeight);

/**
 * The very slow float (the approved prototype): each orb rises and falls by a tenth of its radius
 * and turns slowly, on its own phase and speed, so no two move together.
 */
export const floatOffset = (clock: number, phase: number, speed: number) => ({
  lift: Math.sin(clock * 0.6 * speed + phase) * 0.1,
  turn: clock * 0.08 * speed + phase,
});
