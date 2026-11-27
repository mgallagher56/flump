// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  colourMixAt,
  piecewise,
  progressFromScroll,
  restShare,
  smooth,
  waypointProgress,
} from "./journeyRoute";

describe("smooth", () => {
  it("is 0 and 1 at the ends, a half at the middle, and holds outside", () => {
    expect(smooth(-1)).toBe(0);
    expect(smooth(0)).toBe(0);
    // 0.5² × (3 − 1) = 0.5
    expect(smooth(0.5)).toBe(0.5);
    // 0.25² × (3 − 0.5) = 0.0625 × 2.5 = 0.15625
    expect(smooth(0.25)).toBe(0.15625);
    expect(smooth(1)).toBe(1);
    expect(smooth(2)).toBe(1);
  });
});

describe("progressFromScroll", () => {
  // Anchors: before the first stop at 0, stops at 1000 and 2000, after the last at 3000.
  const anchors = [0, 1000, 2000, 3000];

  it("is -1 at or before the first anchor", () => {
    expect(progressFromScroll(-50, anchors)).toBe(-1);
    expect(progressFromScroll(0, anchors)).toBe(-1);
  });

  it("counts stops from 0 at each stop's anchor, linear between", () => {
    // y 500: i = 0, so -1 + 500 / 1000 = -0.5
    expect(progressFromScroll(500, anchors)).toBe(-0.5);
    // y 1000: i = 1, so 0 + 0 = 0 (the first stop's rest starts)
    expect(progressFromScroll(1000, anchors)).toBe(0);
    // y 2250: i = 2, so 1 + 250 / 1000 = 1.25
    expect(progressFromScroll(2250, anchors)).toBe(1.25);
  });

  it("holds at the last stop count past the end", () => {
    // n = 3 anchors after the first, so n − 1 = 2
    expect(progressFromScroll(9999, anchors)).toBe(2);
  });

  it("is 0 when there is nothing to measure", () => {
    expect(progressFromScroll(100, [5])).toBe(0);
  });
});

describe("piecewise", () => {
  const xs = [0, 10, 20];
  const ys = [0, 100, 400];

  it("interpolates between points and holds at both ends", () => {
    expect(piecewise(-5, xs, ys)).toBe(0);
    // 5 of 10 along the first piece: 50
    expect(piecewise(5, xs, ys)).toBe(50);
    // 15: halfway from 100 to 400 = 250
    expect(piecewise(15, xs, ys)).toBe(250);
    expect(piecewise(25, xs, ys)).toBe(400);
  });
});

describe("restShare", () => {
  it("is the span less the beat, as a share of the span, within 0.15 to 0.8", () => {
    // (1000 − 400) / 1000 = 0.6
    expect(restShare(1000, 400)).toBe(0.6);
    // (1000 − 50) / 1000 = 0.95, held at 0.8
    expect(restShare(1000, 50)).toBe(0.8);
    // (1000 − 950) / 1000 = 0.05, held at 0.15
    expect(restShare(1000, 950)).toBe(0.15);
  });
});

describe("waypointProgress", () => {
  it("puts each stop's waypoint in the middle of its rest, between the start and the end", () => {
    // stop 0: 0 + 0.6 / 2 = 0.3; stop 1: 1 + 0.4 / 2 = 1.2
    expect(waypointProgress([0.6, 0.4], -1.4, 2.8)).toEqual([-1.4, 0.3, 1.2, 2.8]);
  });
});

describe("colourMixAt", () => {
  const shares = [0.6, 0.6, 0.6];

  it("holds the first stop's own colour before the journey", () => {
    expect(colourMixAt(-0.5, shares, 3)).toEqual({
      from: { stop: 0, role: 0 },
      to: { stop: 0, role: 0 },
      t: 0,
    });
  });

  it("turns from a stop's own colour to its accent through the rest", () => {
    // s 1.05: f = 0.05 < 0.6, t = smooth((0.05 − 0.1) / 0.55) = smooth(below 0) = 0
    expect(colourMixAt(1.05, shares, 3)).toEqual({
      from: { stop: 1, role: 0 },
      to: { stop: 1, role: 1 },
      t: 0,
    });
    // s 1.375: f = 0.375, (0.375 − 0.1) / 0.55 = 0.5, smooth = 0.5
    expect(colourMixAt(1.375, shares, 3).t).toBeCloseTo(0.5, 10);
  });

  it("turns from the accent to the next stop's own colour through the travel", () => {
    // s 1.8: f = 0.8 ≥ 0.6, t = smooth((0.8 − 0.6) / 0.4) = smooth(0.5) = 0.5
    const mix = colourMixAt(1.8, shares, 3);
    expect(mix.from).toEqual({ stop: 1, role: 1 });
    expect(mix.to).toEqual({ stop: 2, role: 0 });
    expect(mix.t).toBeCloseTo(0.5, 10);
  });

  it("keeps the last stop's accent after its rest", () => {
    // s 2.9: the last stop (2), f = 0.9 ≥ 0.6, no next stop
    const mix = colourMixAt(2.9, shares, 3);
    expect(mix.from).toEqual({ stop: 2, role: 1 });
    expect(mix.to).toEqual({ stop: 2, role: 1 });
    // past the last stop count it has finished turning
    expect(colourMixAt(3.2, shares, 3)).toEqual({
      from: { stop: 2, role: 1 },
      to: { stop: 2, role: 1 },
      t: 1,
    });
  });
});
