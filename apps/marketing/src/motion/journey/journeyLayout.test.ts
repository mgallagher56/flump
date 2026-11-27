// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  beadDistances,
  bubbleField,
  cssPixels,
  FLOOR_Y,
  farZ,
  floorLattice,
  journeyAnchors,
  journeyEnd,
  laneFor,
  moteField,
  NEAR_Z,
  nearestAlong,
  routeWaypoints,
  stopDepth,
  stopSide,
  TAN,
} from "./journeyLayout";

/*
 * Working: TAN = tan(17.5°) = 0.3152987889; the camera's half height at its distance of 11 is
 * halfH = 11 × 0.3152987889 = 3.4682866777.
 */
const HALF_H = 3.4682866777;

/** A source that hands out the given numbers in turn. */
const script = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe("constants", () => {
  it("has the 35° field of view's half tangent and the route's depths", () => {
    expect(TAN).toBeCloseTo(0.3152987889, 9);
    // 2 × 15
    expect(NEAR_Z).toBe(30);
    // 6 stops: −(6 + 2) × 15 = −120
    expect(farZ(6)).toBe(-120);
    // 6 stops: 6 − 1 + 1.8 = 6.8
    expect(journeyEnd(6)).toBeCloseTo(6.8, 9);
  });
});

describe("laneFor", () => {
  it("is null for an empty stage", () => {
    expect(laneFor(0, 800)).toBeNull();
    expect(laneFor(1280, 0)).toBeNull();
  });

  it("sizes a desktop lane from 130px of the height", () => {
    const lane = laneFor(1280, 800);
    // 130 / 800 = 0.1625, inside 0.11 to 0.17; radius min(66, 0.1625 × 800 × 0.5 = 65) = 65px
    // orbR = 65 / 400 × 3.4682866777 = 0.5635965851
    // camH = (1 − 2 × 0.1625) × 3.4682866777 = 0.675 × 3.4682866777 = 2.3410935074
    // amplitude = 0.4 × 3.4682866777 × 1.6 / 0.4 = 5.5492586843
    expect(lane?.phone).toBe(false);
    expect(lane?.aspect).toBe(1.6);
    expect(lane?.orbR).toBeCloseTo(0.5635965851, 8);
    expect(lane?.camH).toBeCloseTo(2.3410935074, 8);
    expect(lane?.amplitude).toBeCloseTo(5.5492586843, 8);
  });

  it("holds the lane at 11% on a tall stage and the radius at 66px", () => {
    const lane = laneFor(1280, 1400);
    // 130 / 1400 = 0.093, held up to 0.11; radius min(66, 0.11 × 700 = 77) = 66px
    // orbR = 66 / 700 × 3.4682866777 = 0.3270098868
    // camH = (1 − 0.22) × 3.4682866777 = 2.7052636086
    expect(lane?.orbR).toBeCloseTo(0.3270098868, 8);
    expect(lane?.camH).toBeCloseTo(2.7052636086, 8);
  });

  it("holds the lane at 17% on a short stage", () => {
    const lane = laneFor(1280, 600);
    // 130 / 600 = 0.2167, held down to 0.17; radius min(66, 0.17 × 300 = 51) = 51px
    // orbR = 51 / 300 × 3.4682866777 = 0.5896087352; camH = 0.66 × 3.4682866777 = 2.2890692073
    expect(lane?.orbR).toBeCloseTo(0.5896087352, 8);
    expect(lane?.camH).toBeCloseTo(2.2890692073, 8);
  });

  it("uses the phone lane below 768px wide, and the desktop lane at 768", () => {
    const phone = laneFor(767, 1000);
    const desktop = laneFor(768, 1000);
    expect(phone?.phone).toBe(true);
    expect(desktop?.phone).toBe(false);
    // Phone: radius 38px, so orbR = 38 / 500 × 3.4682866777 = 0.2635897875;
    // camH = (1 − 0.25) × 3.4682866777 = 2.6012150083;
    // amplitude = 0.42 × 3.4682866777 × 0.767 / 0.4 = 2.7931846759
    expect(phone?.orbR).toBeCloseTo(0.2635897875, 8);
    expect(phone?.camH).toBeCloseTo(2.6012150083, 8);
    expect(phone?.amplitude).toBeCloseTo(2.7931846759, 8);
    // Desktop: 130 / 1000 = 0.13, radius 65px: orbR = 65 / 500 × 3.4682866777 = 0.4508772681;
    // amplitude = 0.4 × 3.4682866777 × 0.768 / 0.4 = 2.6636441685
    expect(desktop?.orbR).toBeCloseTo(0.4508772681, 8);
    expect(desktop?.amplitude).toBeCloseTo(2.6636441685, 8);
  });

  it("swings the route at least 1.4 on a narrow stage", () => {
    // 0.42 × 3.4682866777 × (200 / 900) / 0.4 = 0.809, held up to 1.4
    expect(laneFor(200, 900)?.amplitude).toBe(1.4);
  });

  it("keeps the camera's half height in its sums", () => {
    // A 1000px tall desktop stage at 130px: camH / (1 − 0.26) gives halfH back.
    expect((laneFor(1000, 1000)?.camH ?? 0) / 0.74).toBeCloseTo(HALF_H, 8);
  });
});

describe("floorLattice", () => {
  it("lays rows 1.1 apart from x −24 to 23.3, from the near depth to 20 past the far", () => {
    // Near 0, far 18: rows run down to 18 − 20 = −2, so rows at 0 and −1.1; −2.2 is past.
    // x: −24 + 1.1k for k 0 to 43 (−24 + 44 × 1.1 = 24.4 is past 24), so 44 a row.
    const next = script(0.25, 0.75);
    const { positions, seeds } = floorLattice(0, 18, FLOOR_Y, next);
    expect(seeds).toHaveLength(88);
    expect(positions).toHaveLength(264);
    expect(positions.slice(0, 3)).toEqual([-24, -2.8, 0]);
    // The 44th point ends the first row: x = −24 + 43 × 1.1 = 23.3.
    expect(positions[43 * 3]).toBeCloseTo(23.3, 9);
    // The second row starts back at the left, 1.1 nearer the far end.
    expect(positions.slice(44 * 3, 44 * 3 + 3)).toEqual([-24, -2.8, -1.1]);
    expect(seeds.slice(0, 3)).toEqual([0.25, 0.75, 0.25]);
  });

  it("lays no points when the near depth is already past the far end", () => {
    expect(floorLattice(-50, -20, FLOOR_Y, script(0.5)).positions).toEqual([]);
  });
});

describe("moteField", () => {
  it("places each mote 30 wide, up to 1.6 above the floor, between the depths, tones in turn", () => {
    // Draws per mote: x, y, z, seed.
    const next = script(0, 1, 0.5, 0.2, 1, 0.25, 0.75, 0.9);
    const { positions, seeds, toneIds } = moteField(5, -2.8, 30, -90, next);
    // Mote 0: x (0 − 0.5) × 30 = −15; y −2.8 + 1 × 1.6 = −1.2; z 30 − 0.5 × 120 = −30
    expect(positions[0]).toBe(-15);
    expect(positions[1]).toBeCloseTo(-1.2, 9);
    expect(positions[2]).toBe(-30);
    // Mote 1: x (1 − 0.5) × 30 = 15; y −2.8 + 0.25 × 1.6 = −2.4; z 30 − 0.75 × 120 = −60
    expect(positions[3]).toBe(15);
    expect(positions[4]).toBeCloseTo(-2.4, 9);
    expect(positions[5]).toBe(-60);
    expect(seeds.slice(0, 2)).toEqual([0.2, 0.9]);
    expect(toneIds).toEqual([0, 1, 2, 3, 0]);
    expect(positions).toHaveLength(15);
  });
});

describe("routeWaypoints", () => {
  it("starts in the middle, swings left then right, and ends in the middle", () => {
    const points = routeWaypoints(3, 4, -2.8);
    // Start: z = 1.4 × 15 = 21. Stops: z = −(k + 0.3) × 15 = −4.5, −19.5, −34.5.
    // End: z = −(3 − 1 + 1.8) × 15 = −57.
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual([0, -2.8, 21]);
    expect(points[1]).toEqual([-4, -2.8, -4.5]);
    expect(points[2]).toEqual([4, -2.8, -19.5]);
    expect(points[3]?.[0]).toBe(-4);
    expect(points[3]?.[2]).toBeCloseTo(-34.5, 9);
    expect(points[4]?.[0]).toBe(0);
    expect(points[4]?.[2]).toBeCloseTo(-57, 9);
  });

  it("names the sides and depths", () => {
    expect([stopSide(0), stopSide(1), stopSide(2), stopSide(5)]).toEqual([-1, 1, -1, 1]);
    expect(stopDepth(0)).toBe(-4.5);
    expect(stopDepth(2)).toBe(-34.5);
  });
});

describe("nearestAlong", () => {
  it("finds the sample nearest the point, as a route distance", () => {
    // The point is at share 0.3 on a straight route of length 50: 0.3 × 50 = 15.
    expect(nearestAlong((u) => (u - 0.3) ** 2, 50, 10)).toBeCloseTo(15, 9);
  });

  it("checks both ends", () => {
    expect(nearestAlong((u) => (u - 1) ** 2, 40, 8)).toBe(40);
    expect(nearestAlong((u) => u, 40, 8)).toBe(0);
  });

  it("keeps the first of two equally near samples", () => {
    // Equal distance at shares 0.25 and 0.75: the first, 0.25 × 100 = 25, wins.
    expect(nearestAlong((u) => Math.abs(Math.abs(u - 0.5) - 0.25), 100, 4)).toBe(25);
  });
});

describe("beadDistances", () => {
  it("places a bead every step from the start, short of the length", () => {
    const d = beadDistances(2, 0.6, 100);
    // 0, 0.6, 1.2, 1.8 (2.4 is past 2)
    expect(d).toHaveLength(4);
    expect(d[3]).toBeCloseTo(1.8, 9);
  });

  it("stops at the most beads allowed", () => {
    expect(beadDistances(100, 0.6, 3)).toHaveLength(3);
  });

  it("places none on an empty route", () => {
    expect(beadDistances(0, 0.6, 10)).toEqual([]);
  });
});

describe("bubbleField", () => {
  it("places six bubbles a stop, behind it, out at the screen's edges", () => {
    const bubbles = bubbleField(2, { amplitude: 4, aspect: 2, phone: false }, -2.8, script(0.5));
    expect(bubbles).toHaveLength(12);
    const [first] = bubbles;
    // Stop 0 is on the left (side −1): wx = −4, wz = −4.5. First bubble: edge 1, share 0.78,
    // up 2.1, back 3, radius 0.55. half = (11 + 3) × 0.3152987889 × 2 = 8.8283660888.
    // x = −4 × 0.6 + 1 × −1 × 8.8283660888 × 0.78 = −2.4 − 6.8861255493 = −9.2861255493
    expect(first?.p[0]).toBeCloseTo(-9.2861255493, 8);
    expect(first?.p[1]).toBeCloseTo(-0.7, 9);
    expect(first?.p[2]).toBe(-7.5);
    expect(first?.r).toBe(0.55);
    expect(first?.stop).toBe(0);
    expect(first?.accent).toBe(false);
    // 0.5 × 2π = π
    expect(first?.seed).toBeCloseTo(Math.PI, 9);
    // Stop 1's last bubble: side 1, wx 4, wz −19.5; edge −1, share 0.7, up 4.2, back 5.5,
    // radius 0.22. half = 16.5 × 0.3152987889 × 2 = 10.4048600341.
    // x = 2.4 − 10.4048600341 × 0.7 = 2.4 − 7.2834020239 = −4.8834020239
    const last = bubbles[11];
    expect(last?.p[0]).toBeCloseTo(-4.8834020239, 8);
    expect(last?.p[1]).toBeCloseTo(1.4, 9);
    expect(last?.p[2]).toBe(-25);
    expect(last?.stop).toBe(1);
    expect(bubbles.map((b) => b.accent).slice(0, 6)).toEqual([
      false,
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("sets them in, higher and smaller on a phone", () => {
    const [first] = bubbleField(1, { amplitude: 4, aspect: 2, phone: true }, -2.8, script(0));
    // x = −2.4 − 6.8861255493 × 0.9 = −8.5975129944; y = −2.8 + 2.1 × 1.25 = −0.175;
    // r = 0.55 × 0.6 = 0.33
    expect(first?.p[0]).toBeCloseTo(-8.5975129944, 8);
    expect(first?.p[1]).toBeCloseTo(-0.175, 9);
    expect(first?.r).toBeCloseTo(0.33, 9);
    expect(first?.seed).toBe(0);
  });

  it("places none with no stops", () => {
    expect(bubbleField(0, { amplitude: 4, aspect: 1, phone: false }, -2.8, script(0.5))).toEqual(
      [],
    );
  });
});

describe("cssPixels", () => {
  it("reads a pixel length, and 0 for auto, empty or missing", () => {
    expect(cssPixels("96px")).toBe(96);
    expect(cssPixels("-40.5px")).toBe(-40.5);
    expect(cssPixels("auto")).toBe(0);
    expect(cssPixels("")).toBe(0);
    expect(cssPixels(undefined)).toBe(0);
  });
});

describe("journeyAnchors", () => {
  it("anchors each stop where its frame holds, with one a unit before and after", () => {
    const { anchors, restShares } = journeyAnchors(
      [
        { top: 1100, stickyTop: 100, beat: 400 },
        { top: 2600, stickyTop: 100, beat: 300 },
        { top: 4100, stickyTop: 100, beat: 0 },
      ],
      900,
      800,
    );
    // Starts: 1000, 2500, 4000; the unit is the first span, 1500.
    expect(anchors).toEqual([-500, 1000, 2500, 4000, 5500]);
    // Stop 0: (1500 − 400) / 1500 = 0.7333; stop 1: (1500 − 300) / 1500 = 0.8 (the cap);
    // stop 2: span to start + unit = 1500, (1500 − 0) / 1500 = 1, held to 0.8.
    expect(restShares[0]).toBeCloseTo(0.7333333333, 9);
    expect(restShares[1]).toBeCloseTo(0.8, 9);
    expect(restShares[2]).toBe(0.8);
  });

  it("uses the viewport height as the unit with one stop", () => {
    const { anchors, restShares } = journeyAnchors(
      [{ top: 2000, stickyTop: 0, beat: 600 }],
      1800,
      900,
    );
    // Unit 900: before 1100, the stop 2000, after 2900. Rest (900 − 600) / 900 = 0.3333.
    expect(anchors).toEqual([1100, 2000, 2900]);
    expect(restShares[0]).toBeCloseTo(0.3333333333, 9);
  });

  it("falls back to the journey's top with no stops", () => {
    // first = 1800, unit = 900: before 900, then the top itself.
    expect(journeyAnchors([], 1800, 900)).toEqual({ anchors: [900, 1800], restShares: [] });
  });

  it("keeps the unit at least 1 when stops share a start", () => {
    const { anchors } = journeyAnchors(
      [
        { top: 500, stickyTop: 0, beat: 0 },
        { top: 500, stickyTop: 0, beat: 0 },
      ],
      0,
      800,
    );
    expect(anchors).toEqual([499, 500, 500, 501]);
  });
});
