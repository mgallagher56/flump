/*
 * A small seeded number source for the journey scene's decoration (the floor's sparkle, the motes,
 * the bubbles' drift phase). Mulberry32: fast, 32-bit state, and the same run of numbers for the
 * same seed on every load and in every browser, so the scene looks the same each visit. Not for
 * anything secret: it is decoration only.
 */

/** A source of numbers in [0, 1). */
export type NumberSource = () => number;

/** Mulberry32 seeded with `seed` (taken as an unsigned 32-bit integer). */
export function mulberry32(seed: number): NumberSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The fixed seeds, one per decoration, so a resize redraws each the same as before. */
export const SCENE_SEEDS = { floor: 0x5eed01, motes: 0x5eed02, bubbles: 0x5eed03 } as const;
