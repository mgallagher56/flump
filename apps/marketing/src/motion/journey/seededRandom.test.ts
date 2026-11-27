// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mulberry32, SCENE_SEEDS } from "./seededRandom";

const take = (seed: number, n: number) => {
  const next = mulberry32(seed);
  return Array.from({ length: n }, () => next());
};

describe("mulberry32", () => {
  it("gives the published Mulberry32 run for seed 1", () => {
    // Reference values from an independent Python port of the published algorithm (32-bit
    // wrap-around by masking with 0xffffffff), not from this module.
    expect(take(1, 3)).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  });

  it("gives a different run for a different seed", () => {
    // Same independent Python port, seed 42.
    expect(take(42, 3)).toEqual([0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
  });

  it("repeats the same run for the same seed, so every load looks the same", () => {
    expect(take(SCENE_SEEDS.floor, 50)).toEqual(take(SCENE_SEEDS.floor, 50));
  });

  it("takes a seed as an unsigned 32-bit integer", () => {
    // -1 >>> 0 is 0xffffffff, and 2^32 + 1 wraps to 1.
    expect(take(-1, 2)).toEqual(take(0xffffffff, 2));
    expect(take(2 ** 32 + 1, 3)).toEqual(take(1, 3));
  });

  it("stays in [0, 1) over a long run", () => {
    const values = take(SCENE_SEEDS.motes, 5000);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
  });

  it("gives each decoration its own seed", () => {
    expect(new Set(Object.values(SCENE_SEEDS)).size).toBe(3);
  });
});
