import { describe, expect, it } from "vitest";
import { MAX_Y_TICKS, nearDataAxis } from "./yAxisTicks";

describe("nearDataAxis", () => {
  it("starts near the data, not at £0", () => {
    expect(nearDataAxis([96_000, 405_000])).toEqual({
      domain: [75_000, 425_000],
      ticks: [100_000, 200_000, 300_000, 400_000],
    });
    const savings = nearDataAxis([17_600, 41_500]);
    expect(savings.domain[0]).toBeGreaterThan(15_000);
    expect(savings.ticks).toEqual([20_000, 30_000, 40_000]);
  });

  it("keeps £0 when the data starts near it, and never goes below it", () => {
    const axis = nearDataAxis([9_000, 205_628]);
    expect(axis.domain[0]).toBe(0);
    expect(axis.ticks[0]).toBe(0);
  });

  it("always gives 3 to 5 ticks inside the domain", () => {
    for (const range of [
      [3_200, 13_852],
      [9_000, 205_628],
      [96_000, 405_000],
      [17_600, 41_500],
      [1_000, 1_020],
    ]) {
      const { domain, ticks } = nearDataAxis(range);
      expect(ticks.length).toBeGreaterThanOrEqual(3);
      expect(ticks.length).toBeLessThanOrEqual(MAX_Y_TICKS);
      expect(ticks[0]).toBeGreaterThanOrEqual(domain[0]);
      expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(domain[1]);
    }
  });

  it("widens a flat series so the line sits inside a real range", () => {
    for (const value of [5_000, 0]) {
      const { domain, ticks } = nearDataAxis([value, value, value]);
      expect(domain[0]).toBeLessThanOrEqual(value);
      expect(domain[1]).toBeGreaterThan(value);
      expect(domain[0]).toBeGreaterThanOrEqual(0);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      expect(ticks.length).toBeLessThanOrEqual(MAX_Y_TICKS);
    }
  });

  it("handles no data", () => {
    expect(nearDataAxis([])).toEqual({ domain: [0, 1], ticks: [0] });
  });
});
