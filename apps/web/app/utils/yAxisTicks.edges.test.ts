// @vitest-environment node
import { describe, expect, it } from "vitest";
import { nearDataAxis } from "./yAxisTicks";

// niceStep (from @repo/ui) rounds a raw step up to 1, 2, 2.5, 5 or 10 times a power of ten.

describe("nearDataAxis worked cases", () => {
  it("uses the first division that gives 3 or 4 ticks", () => {
    // Span 1,000. Divisions 4, 5 and 6 give steps 250, 200 and 200: 5 or 6 ticks, too many.
    // Division 3 gives step niceStep(333) = 500, pad 125: lo 1,000, hi 2,000, ticks 1,000 to 2,000.
    expect(nearDataAxis([1_000, 2_000])).toEqual({
      domain: [1_000, 2_000],
      ticks: [1_000, 1_500, 2_000],
    });
  });

  it("keeps the first fitting division even when a later one has more ticks", () => {
    // Span 21,000. Division 4: step niceStep(5,250) = 10,000, pad 2,500, lo floor(1,000 / 2,500)
    // = 0, hi ceil(22,000 / 2,500) x 2,500 = 22,500. lo is 0 with positive data, so it moves to a
    // grid of 500: floor((1,000 - 625) / 500) x 500 = 0. Ticks 0, 10,000, 20,000: three, so done.
    expect(nearDataAxis([1_000, 22_000])).toEqual({
      domain: [0, 22_500],
      ticks: [0, 10_000, 20_000],
    });
  });

  it("ignores values that are not finite", () => {
    // Same as [1,000, 2,000] above once NaN and Infinity are dropped.
    expect(nearDataAxis([Number.NaN, 1_000, Number.POSITIVE_INFINITY, 2_000])).toEqual({
      domain: [1_000, 2_000],
      ticks: [1_000, 1_500, 2_000],
    });
  });

  it("widens a flat positive series by a nice step and falls back to two ticks", () => {
    // Step niceStep(5,000 / 4 = 1,250) = 2,000, so the range is 3,000 to 7,000 (span 4,000).
    // Divisions 4, 5 and 6 all give step 1,000: five ticks, too many. Division 3 gives step
    // 2,000, pad 500, lo 3,000, hi 7,000 and ticks 4,000 and 6,000: two, kept as the fallback.
    expect(nearDataAxis([5_000, 5_000])).toEqual({
      domain: [3_000, 7_000],
      ticks: [4_000, 6_000],
    });
  });

  it("widens a flat negative series below as well as above", () => {
    // Step 2,000 as above, so the range is -7,000 to -3,000; the same divisions give ticks
    // -6,000 and -4,000 with the domain left at -7,000 to -3,000 (no clamp at £0 for debt).
    expect(nearDataAxis([-5_000, -5_000])).toEqual({
      domain: [-7_000, -3_000],
      ticks: [-6_000, -4_000],
    });
  });

  it("skips a two-tick division and keeps looking when the data crosses £0", () => {
    // Span 204. Division 4: step niceStep(51) = 100, pad 25, lo -50, hi 175, ticks 0 and 100:
    // only two, so it is held as a fallback. Division 5: step niceStep(40.8) = 50, pad 12.5,
    // lo floor(-34 / 12.5) x 12.5 = -37.5, hi ceil(170 / 12.5) x 12.5 = 175, ticks 0, 50, 100,
    // 150: four, so it wins.
    const axis = nearDataAxis([-34, 170]);
    expect(axis.domain).toEqual([-37.5, 175]);
    // The first tick is computed as -0; adding 0 reads it as plain 0.
    expect(axis.ticks.map((t) => t + 0)).toEqual([0, 50, 100, 150]);
  });
});
