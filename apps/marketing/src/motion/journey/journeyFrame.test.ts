// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { OrbTone } from "../../components/GlassOrb/GlassOrb";
import {
  beadLook,
  bubbleRise,
  easeShare,
  followLean,
  followProgress,
  frameAction,
  frameDelta,
  isDarkCanvas,
  orbToneAt,
  rimRole,
  rollStep,
  routeAlong,
  routeShare,
  sceneLook,
  shouldLoop,
  stopIndexAt,
  stopLightIntensity,
  stopTonesAt,
  toneShare,
} from "./journeyFrame";

const TONES: readonly (readonly [OrbTone, OrbTone])[] = [
  ["sky", "teal"],
  ["violet", "rose"],
];

describe("frameDelta", () => {
  it("is 0 on the first frame", () => {
    expect(frameDelta(1000, 0)).toBe(0);
  });

  it("is the seconds since the last frame, held to 0.05", () => {
    // 16ms = 0.016s
    expect(frameDelta(1016, 1000)).toBeCloseTo(0.016, 9);
    // On the edge: 50ms = 0.05s; past it, 100ms is held to 0.05.
    expect(frameDelta(1050, 1000)).toBe(0.05);
    expect(frameDelta(1049, 1000)).toBeCloseTo(0.049, 9);
    expect(frameDelta(1100, 1000)).toBe(0.05);
  });
});

describe("easing", () => {
  it("moves 1 − e^(−dt × rate) of the way", () => {
    // 1 − e^(−0.5 × 2) = 1 − e^−1 = 0.6321205588
    expect(easeShare(0.5, 2)).toBeCloseTo(0.6321205588, 9);
    expect(easeShare(0, 2)).toBe(0);
  });

  it("follows scroll at the calm pace, jumping on the first frames or when snapped", () => {
    // Below −1.5 it jumps straight to the target.
    expect(followProgress(-2, 3, 0.016, false)).toBe(3);
    // At −1.5 it eases: rate 3.6 / 1.4 = 2.5714, × 0.7s = 1.8; 1 − e^−1.8 = 0.8347011118;
    // −1.5 + (1 − −1.5) × 0.8347011118 = 0.5867527795
    expect(followProgress(-1.5, 1, 0.7, false)).toBeCloseTo(0.5867527795, 9);
    expect(followProgress(0.5, 2, 0.016, true)).toBe(2);
  });

  it("leans into the turn at 2.5 a second, at once when snapped", () => {
    // 1 − e^(−0.4 × 2.5) = 0.6321205588; 0.2 + 0.8 × 0.6321205588 = 0.7056964471
    expect(followLean(0.2, 1, 0.4, false)).toBeCloseTo(0.7056964471, 9);
    expect(followLean(0.2, 1, 0.4, true)).toBe(1);
  });

  it("turns the orb's colour at 2.2 a second over the pace", () => {
    // 2.2 / 1.4 × 0.7 = 1.1; 1 − e^−1.1 = 0.6671289163
    expect(toneShare(0.7)).toBeCloseTo(0.6671289163, 9);
  });
});

describe("the orb on the route", () => {
  const waypointS = [-1.4, 0.25, 1.25, 2.8];
  const routeAt = [0, 20, 50, 80];

  it("maps progress to route distance between waypoints", () => {
    // s 0.75 is half way from 0.25 to 1.25: 20 + 30 × 0.5 = 35
    expect(routeAlong(0.75, waypointS, routeAt, 80)).toBe(35);
  });

  it("holds the distance to the route", () => {
    expect(routeAlong(10, waypointS, routeAt, 70)).toBe(70);
    expect(routeAlong(-3, [-1, 0], [-5, 10], 80)).toBe(0);
  });

  it("gives the share of the route, 0 to 1", () => {
    // 35 / 80 = 0.4375
    expect(routeShare(35, 80)).toBe(0.4375);
    expect(routeShare(90, 80)).toBe(1);
    expect(routeShare(-1, 80)).toBe(0);
  });

  it("rolls the distance moved over the radius", () => {
    // (10.5 − 10) / 0.25 = 2
    expect(rollStep(10.5, 10, 0.25)).toBe(2);
    // Backwards: (9 − 10) / 0.5 = −2
    expect(rollStep(9, 10, 0.5)).toBe(-2);
    // From the very start (0 counts): 1 / 0.5 = 2
    expect(rollStep(1, 0, 0.5)).toBe(2);
  });

  it("does not roll on the first frame or across a jump of 3 or more", () => {
    expect(rollStep(10, -1, 0.25)).toBe(0);
    expect(rollStep(13, 10, 1)).toBe(0);
    expect(rollStep(7, 10, 1)).toBe(0);
    expect(rollStep(12.5, 10, 1)).toBe(2.5);
  });
});

describe("stop colours", () => {
  it("finds the stop at or before progress, held to the stops", () => {
    expect(stopIndexAt(-0.5, 6)).toBe(0);
    expect(stopIndexAt(2.7, 6)).toBe(2);
    expect(stopIndexAt(3, 6)).toBe(3);
    expect(stopIndexAt(9, 6)).toBe(5);
  });

  it("reads a stop's colours, held to the stops, sky and violet with none", () => {
    expect(stopTonesAt(TONES, -1, 2)).toEqual(["sky", "teal"]);
    expect(stopTonesAt(TONES, 1, 2)).toEqual(["violet", "rose"]);
    expect(stopTonesAt(TONES, 5, 2)).toEqual(["violet", "rose"]);
    expect(stopTonesAt([], 0, 1)).toEqual(["sky", "violet"]);
  });

  it("names the orb's colours: own to accent in the rest, accent to the next stop's own after", () => {
    const shares = [0.5, 0.5];
    // Before the first stop: its own colour, still.
    expect(orbToneAt(-1, shares, TONES, 2)).toEqual({ from: "sky", to: "sky", t: 0 });
    // s 0.2, resting at stop 0: smooth((0.2 − 0.1) / (0.5 − 0.05)) = smooth(0.2222) = 0.1262002743
    const resting = orbToneAt(0.2, shares, TONES, 2);
    expect([resting.from, resting.to]).toEqual(["sky", "teal"]);
    expect(resting.t).toBeCloseTo(0.1262002743, 9);
    // s 0.75, travelling: smooth((0.25) / (0.5)) = 0.5, teal to violet
    expect(orbToneAt(0.75, shares, TONES, 2)).toEqual({ from: "teal", to: "violet", t: 0.5 });
    // The last stop keeps its accent: rose to rose, smooth(0.4 / 0.5) = 0.896
    const last = orbToneAt(1.9, shares, TONES, 2);
    expect([last.from, last.to]).toEqual(["rose", "rose"]);
    expect(last.t).toBeCloseTo(0.896, 9);
  });

  it("lights the second rim in the accent through the rest, then the stop's own", () => {
    expect(rimRole(0.3, 0, [0.5])).toBe(1);
    expect(rimRole(0.49, 0, [0.5])).toBe(1);
    expect(rimRole(0.5, 0, [0.5])).toBe(0);
    // Stop 1 not measured: a half.
    expect(rimRole(1.4, 1, [0.5])).toBe(1);
    expect(rimRole(1.6, 1, [0.5])).toBe(0);
  });
});

describe("stopLightIntensity", () => {
  it("is full at the waypoint, brighter on Mint", () => {
    expect(stopLightIntensity(2.25, 2.25, true)).toBe(22);
    expect(stopLightIntensity(2.25, 2.25, false)).toBe(28);
  });

  it("fades by distance either side, gone at 0.9", () => {
    // 0.45 / 0.9 = 0.5, smooth 0.5 = 0.5: 28 × 0.5 = 14 and 22 × 0.5 = 11
    expect(stopLightIntensity(2.7, 2.25, false)).toBeCloseTo(14, 9);
    expect(stopLightIntensity(1.8, 2.25, true)).toBeCloseTo(11, 9);
    expect(stopLightIntensity(3.15, 2.25, false)).toBe(0);
  });
});

describe("beadLook", () => {
  it("is full size and glowing right at the orb", () => {
    // g = smooth(2.4 / 2.4) = 1: radius 0.075; trail e^0 = 1: Mint glow 1 + 1.2 = 2.2
    expect(beadLook(10, 10, false, false)).toEqual({ radius: 0.075, glow: 2.2, whiten: 0.08 });
    // Midnight: glow 1 + 1.1 = 2.1, no white mixed in
    expect(beadLook(10, 10, false, true)).toEqual({ radius: 0.075, glow: 2.1, whiten: 0 });
  });

  it("is small and unlit ahead of the orb", () => {
    // 2.4 ahead: g = smooth(0) = 0, radius 0.075 × 0.45 = 0.03375
    const far = beadLook(10, 12.4, false, false);
    expect(far.radius).toBeCloseTo(0.03375, 9);
    expect(far.glow).toBe(1);
    // 1.2 ahead: g = smooth(0.5) = 0.5, radius 0.075 × (0.45 + 0.275) = 0.054375
    expect(beadLook(10, 11.2, false, false).radius).toBeCloseTo(0.054375, 9);
  });

  it("fades the glow behind the orb, and is smaller on a phone", () => {
    // 2.2 behind: trail e^−1 = 0.3678794412; Mint glow 1 + 0.3678794412 × 1.2 = 1.4414553294
    expect(beadLook(10, 7.8, false, false).glow).toBeCloseTo(1.4414553294, 9);
    // Phone: 0.075 × 0.85 = 0.06375
    expect(beadLook(10, 7.8, true, false).radius).toBeCloseTo(0.06375, 9);
  });
});

describe("bubbleRise", () => {
  const bubble = { z: -10, stop: 2, seed: 0, r: 0.5 };

  it("is sunk and gone before its stop is near", () => {
    // s 1.6: smooth((1.6 − 2 + 0.4) / 0.6) = 0: lift −0.9, scale held to 1e−4
    expect(bubbleRise(bubble, 5, 1.6, 0)).toEqual({ lift: -0.9, scale: 1e-4 });
  });

  it("grows over the 0.6 from 0.4 before its stop", () => {
    // s 2: grow = smooth(0.4 / 0.6) = 0.7407407407 (clearance smooth((5 + 10 − 4) / 5) = 1);
    // lift = sin 0 × 0.14 − (1 − 0.7407407407) × 0.9 = −0.2333333333; scale 0.3703703704
    const rise = bubbleRise(bubble, 5, 2, 0);
    expect(rise.lift).toBeCloseTo(-0.2333333333, 9);
    expect(rise.scale).toBeCloseTo(0.3703703704, 9);
  });

  it("drifts by 0.14 once full grown", () => {
    // sin(0 × 0.45 + π / 2) × 0.14 = 0.14
    expect(bubbleRise({ ...bubble, seed: Math.PI / 2 }, 5, 2.2, 0)).toEqual({
      lift: 0.14,
      scale: 0.5,
    });
  });

  it("sinks away as the camera reaches it", () => {
    // Camera at −6: smooth((−6 + 10 − 4) / 5) = 0
    expect(bubbleRise(bubble, -6, 2.2, 0).scale).toBe(1e-4);
    // Camera at −3.5: smooth(0.5) = 0.5: lift −0.45, scale 0.25
    const half = bubbleRise(bubble, -3.5, 2.2, 0);
    expect(half.lift).toBeCloseTo(-0.45, 9);
    expect(half.scale).toBeCloseTo(0.25, 9);
  });
});

describe("frameAction", () => {
  it("does nothing without a verdict", () => {
    expect(frameAction(null)).toBe("none");
  });

  it("drops the pixel ratio on a downgrade, and reports any other verdict", () => {
    expect(frameAction({ kind: "downgrade", fps: 40 })).toBe("downgrade");
    expect(frameAction({ kind: "settled", fps: 60 })).toBe("report");
    expect(frameAction({ kind: "too-slow", fps: 20 })).toBe("report");
  });
});

describe("shouldLoop", () => {
  it("runs only on screen, running and visible", () => {
    expect(shouldLoop({ onScreen: true, running: true, hidden: false })).toBe(true);
    expect(shouldLoop({ onScreen: false, running: true, hidden: false })).toBe(false);
    expect(shouldLoop({ onScreen: true, running: false, hidden: false })).toBe(false);
    expect(shouldLoop({ onScreen: true, running: true, hidden: true })).toBe(false);
  });
});

describe("isDarkCanvas", () => {
  it("is Midnight under a luminance of 0.3", () => {
    // 0.2126 × 0.05 + 0.7152 × 0.07 + 0.0722 × 0.1 = 0.0679
    expect(isDarkCanvas(0.05, 0.07, 0.1)).toBe(true);
    expect(isDarkCanvas(0.29, 0.29, 0.29)).toBe(true);
    // On the edge: the weights sum to 1, so grey 0.3 has a luminance of exactly 0.3.
    expect(isDarkCanvas(0.3, 0.3, 0.3)).toBe(false);
    expect(isDarkCanvas(0.9, 0.95, 0.92)).toBe(false);
  });

  it("weighs green most and blue least", () => {
    // Green 0.42: 0.7152 × 0.42 = 0.3004, light. Red 1: 0.2126, dark. Blue 1: 0.0722, dark.
    expect(isDarkCanvas(0, 0.42, 0)).toBe(false);
    expect(isDarkCanvas(1, 0, 0)).toBe(true);
    expect(isDarkCanvas(0, 0, 1)).toBe(true);
  });
});

describe("sceneLook", () => {
  it("sets Midnight's materials and lights", () => {
    expect(sceneLook(true)).toEqual({
      floorOpacity: 0.72,
      moteOpacity: 0.55,
      additive: true,
      glassTransmission: 0.88,
      glassEnvIntensity: 1.05,
      glassRoughness: 0.05,
      orbThickness: 0.9,
      orbAttenuationDistance: 0.8,
      beadTransmission: 0.55,
      orbRim: 1.2,
      orbGlow: 0.06,
      beadRim: 0.9,
      beadGlow: 0.14,
      bubbleRim: 1,
      bubbleGlow: 0.05,
      keyLight: 1.3,
      bubbleTint: 1,
      orbAttenuationTint: 0.85,
      orbColourTint: 0.9,
      orbEmissive: 0.08,
      shadowInOrbTone: true,
      shadowOpacity: 0.2,
      rimA: 12,
      rimB: 9,
    });
  });

  it("sets Mint's materials and lights", () => {
    expect(sceneLook(false)).toEqual({
      floorOpacity: 0.4,
      moteOpacity: 0.4,
      additive: false,
      glassTransmission: 0.94,
      glassEnvIntensity: 0.75,
      glassRoughness: 0.04,
      orbThickness: 0.8,
      orbAttenuationDistance: 1.6,
      beadTransmission: 0.85,
      orbRim: 0.8,
      orbGlow: 0,
      beadRim: 0.6,
      beadGlow: 0.04,
      bubbleRim: 0.7,
      bubbleGlow: 0,
      keyLight: 1.8,
      bubbleTint: 0.88,
      orbAttenuationTint: 0.7,
      orbColourTint: 0.75,
      orbEmissive: 0,
      shadowInOrbTone: false,
      shadowOpacity: 0.22,
      rimA: 9,
      rimB: 6,
    });
  });
});
