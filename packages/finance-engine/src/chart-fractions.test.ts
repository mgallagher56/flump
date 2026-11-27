// @vitest-environment node
import { describe, expect, it } from "vitest";
import { selectChartFractions } from "./chart-fractions.js";

describe("selectChartFractions", () => {
  it("puts the lowest value at 0, the highest at 1 and the rest on one linear scale", () => {
    // Low 1,000, high 3,000, span 2,000: 1,000 -> 0; 2,000 -> 1,000 / 2,000 = 0.5; 3,000 -> 1;
    // 1,500 -> 500 / 2,000 = 0.25.
    expect(selectChartFractions([1000, 2000, 3000, 1500])).toEqual([0, 0.5, 1, 0.25]);
  });

  it("scales negative values the same way, with no zero line", () => {
    // Low -200, high 600, span 800: -200 -> 0; 0 -> 200 / 800 = 0.25; 600 -> 1.
    expect(selectChartFractions([-200, 0, 600])).toEqual([0, 0.25, 1]);
  });

  it("rounds each fraction to four places", () => {
    // Low 0, high 3: 1 -> 1/3 = 0.33333... -> 0.3333; 2 -> 2/3 = 0.66666... -> 0.6667.
    expect(selectChartFractions([0, 1, 2, 3])).toEqual([0, 0.3333, 0.6667, 1]);
  });

  it("an unchanging line, and a single point, sit in the middle", () => {
    expect(selectChartFractions([5000, 5000, 5000])).toEqual([0.5, 0.5, 0.5]);
    expect(selectChartFractions([42])).toEqual([0.5]);
  });

  it("a value that is not a finite number sits in the middle and does not stretch the scale", () => {
    // Scale from the finite values only: low 100, high 300; NaN and Infinity -> 0.5.
    expect(selectChartFractions([100, Number.NaN, 300, Number.POSITIVE_INFINITY])).toEqual([
      0, 0.5, 1, 0.5,
    ]);
    expect(selectChartFractions([Number.NaN])).toEqual([0.5]);
  });

  it("no values, no fractions", () => {
    expect(selectChartFractions([])).toEqual([]);
  });
});
