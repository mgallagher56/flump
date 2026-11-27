// @vitest-environment node
import { describe, expect, it } from "vitest";
import { floatOffset, placesFromBoxes, worldPerPixel } from "./heroOrbLayout";

describe("placesFromBoxes", () => {
  it("gives each orb's centre as a share of the stage and its width as the diameter", () => {
    // Stage at (100, 50), 1000 by 400. An orb box at (700, 150), 200 wide: its centre is
    // (800, 250), so x = (800 - 100) / 1000 = 0.7 and y = (250 - 50) / 400 = 0.5.
    const places = placesFromBoxes({ left: 100, top: 50, width: 1000, height: 400 }, [
      { box: { left: 700, top: 150, width: 200, height: 200 }, tone: "violet" },
    ]);
    expect(places).toEqual([{ x: 0.7, y: 0.5, d: 200, tone: "violet" }]);
  });

  it("skips an orb with no size and gives nothing for a stage with no size", () => {
    const orb = { box: { left: 0, top: 0, width: 0, height: 0 }, tone: "sky" as const };
    expect(placesFromBoxes({ left: 0, top: 0, width: 500, height: 300 }, [orb])).toEqual([]);
    const sized = { box: { left: 0, top: 0, width: 10, height: 10 }, tone: "sky" as const };
    expect(placesFromBoxes({ left: 0, top: 0, width: 0, height: 300 }, [sized])).toEqual([]);
    expect(placesFromBoxes({ left: 0, top: 0, width: 500, height: 0 }, [sized])).toEqual([]);
  });
});

describe("worldPerPixel", () => {
  it("spreads the view's height at the orbs' depth over the stage's pixels", () => {
    // 2 * 42 * 0.5 = 42 world units across a 420px stage: 0.1 a pixel.
    expect(worldPerPixel(420, 42, 0.5)).toBeCloseTo(0.1, 10);
    // A stage with no height counts as one pixel, never a division by zero.
    expect(worldPerPixel(0, 42, 0.5)).toBe(42);
  });
});

describe("floatOffset", () => {
  it("rises by at most a tenth of the radius and turns from the orb's own phase", () => {
    expect(floatOffset(0, 0, 1)).toEqual({ lift: 0, turn: 0 });
    // sin(0 + pi / 2) = 1: the top of the float, a tenth of the radius.
    expect(floatOffset(0, Math.PI / 2, 1).lift).toBeCloseTo(0.1, 10);
    // After 10 s at speed 1: turn = 10 * 0.08 = 0.8 radians.
    expect(floatOffset(10, 0, 1).turn).toBeCloseTo(0.8, 10);
  });
});
