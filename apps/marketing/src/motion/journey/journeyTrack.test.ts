// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  beadPositions,
  clampAnchors,
  EDGE_INSET,
  edgeFade,
  orbTargetY,
  railMetrics,
  stopBlend,
  trackX,
} from "./journeyTrack";

/** The rail widths HomeJourney gives the orb, phone to wide screen. */
const RAIL_WIDTHS = [40, 72, 160, 200];

describe("journeyTrack", () => {
  it("keeps the whole orb and its glow inside the rail at every rail width (never cut by an edge)", () => {
    for (const width of RAIL_WIDTHS) {
      const { orbRadius, amplitude } = railMetrics(width);
      const outerEdge = amplitude + orbRadius * 1.1;
      expect(outerEdge, `rail ${width}px`).toBeLessThanOrEqual(width / 2 - EDGE_INSET + 1e-9);
      expect(orbRadius, `rail ${width}px`).toBeGreaterThanOrEqual(6);
    }
    expect(railMetrics(40)).toMatchObject({ orbRadius: 8 });
    expect(railMetrics(200)).toMatchObject({ orbRadius: 40, amplitude: 48 });
  });

  it("swings the track from side to side, level with each stop, and holds its side beyond the ends", () => {
    const anchors = [100, 500, 900];
    expect(trackX(100, anchors, 30)).toBe(-30);
    expect(trackX(500, anchors, 30)).toBe(30);
    expect(trackX(900, anchors, 30)).toBe(-30);
    expect(trackX(300, anchors, 30)).toBeCloseTo(0, 6);
    expect(trackX(0, anchors, 30)).toBe(-30);
    expect(trackX(2000, anchors, 30)).toBe(-30);
    expect(trackX(300, anchors, 0)).toBe(0);
  });

  it("blends each stop's colour into the next between their anchors", () => {
    const anchors = [100, 500, 900];
    expect(stopBlend(50, anchors)).toEqual({ from: 0, to: 0, t: 0 });
    expect(stopBlend(300, anchors)).toEqual({ from: 0, to: 1, t: 0.5 });
    expect(stopBlend(950, anchors)).toEqual({ from: 2, to: 2, t: 0 });
  });

  it("keeps the first and last anchors far enough in that the orb fits", () => {
    expect(clampAnchors([0, 400, 1000], 1000, 20)).toEqual([30, 400, 970]);
  });

  it("rests the orb on the reading line, held between the first and last stops and inside the visible stage", () => {
    const base = { stageHeight: 800, visibleTop: 64, anchors: [100, 1500, 3000], orbRadius: 40 };
    // Mid-journey: 40% down the part of the stage below the header.
    expect(orbTargetY({ ...base, stageTop: 1000 })).toBeCloseTo(1000 + 64 + 736 * 0.4, 6);
    // Before the first stop's level, it waits at the first stop, still wholly visible.
    expect(orbTargetY({ ...base, stageTop: 0, anchors: [600, 1500] })).toBe(600);
    // Never under the header or past the stage edge, even where the reading line would put it.
    expect(orbTargetY({ ...base, stageTop: 0, visibleTop: 0, anchors: [0, 1500] })).toBeCloseTo(
      320,
      6,
    );
    expect(orbTargetY({ ...base, stageTop: 0, visibleTop: 790, anchors: [0, 1500] })).toBe(
      790 + 44 + EDGE_INSET,
    );
    // Past the last stop it stays at the last one.
    expect(orbTargetY({ ...base, stageTop: 2700 })).toBe(3000);
  });

  it("shrinks beads to nothing at the stage's edges and leaves the middle full size", () => {
    expect(edgeFade(0, 800)).toBe(0);
    expect(edgeFade(800, 800)).toBe(0);
    expect(edgeFade(400, 800)).toBe(1);
  });

  it("lays beads only between the first and the last stop, one step apart", () => {
    const metrics = railMetrics(160);
    const beads = beadPositions([100, 400], metrics);
    expect(beads[0]?.y).toBe(100);
    expect(beads.at(-1)?.y).toBeLessThanOrEqual(400);
    expect(beads[1]?.y).toBeCloseTo(100 + metrics.beadStep, 6);
    expect(beadPositions([100], metrics)).toEqual([]);
  });
});
