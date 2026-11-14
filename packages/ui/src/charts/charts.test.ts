import { describe, expect, it } from "vitest";
import { token } from "../../styled-system/tokens";
import {
  CHART_COLOR_ROLES,
  CHART_RULES,
  capSeriesWithOther,
  chartColor,
  DONUT_GEOMETRY,
  formatAxisCurrency,
  seriesColor,
} from "./index";

describe("chartColor", () => {
  it("matches the Panda generated CSS variable for every role", () => {
    for (const role of CHART_COLOR_ROLES) {
      const generated = token.var(`colors.chart.${role}`);
      expect(chartColor(role), role).toBe(generated);
    }
  });

  it("kebab-cases camelCase roles", () => {
    expect(chartColor("accentPurple")).toBe("var(--colors-chart-accent-purple)");
    expect(chartColor("series1")).toBe("var(--colors-chart-series1)");
  });
});

describe("seriesColor", () => {
  it("maps 0..7 to series1..series8 and cycles", () => {
    expect(seriesColor(0)).toBe(chartColor("series1"));
    expect(seriesColor(7)).toBe(chartColor("series8"));
    expect(seriesColor(8)).toBe(chartColor("series1"));
    expect(seriesColor(17)).toBe(chartColor("series2"));
  });
  it("handles negative and non-finite indices", () => {
    expect(seriesColor(-1)).toBe(chartColor("series8"));
    expect(seriesColor(Number.NaN)).toBe(chartColor("series1"));
  });
});

describe("formatAxisCurrency", () => {
  it.each([
    [0, "£0"],
    [-0, "£0"],
    [5, "£5"],
    [800, "£800"],
    [999, "£999"],
    [1000, "£1k"],
    [1234, "£1.2k"],
    [800_000, "£800k"],
    [-3400, "-£3.4k"],
    [1_200_000, "£1.2m"],
    [999_949, "£999.9k"],
    [999_950, "£1m"],
    [999_999, "£1m"],
    [1_000_000, "£1m"],
    [999_950_000, "£1bn"],
    [1_500_000_000, "£1.5bn"],
    [-1_250_000, "-£1.3m"],
    [-0.4, "£0"],
    [999.6, "£1k"],
    [12_345_678, "£12.3m"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatAxisCurrency(value)).toBe(expected);
  });

  it("returns an empty string for non-finite values", () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(formatAxisCurrency(v)).toBe("");
    }
  });

  it("supports maxFractionDigits", () => {
    expect(formatAxisCurrency(1_234_567, { maxFractionDigits: 2 })).toBe("£1.23m");
    expect(formatAxisCurrency(1_234_567, { maxFractionDigits: 0 })).toBe("£1m");
  });
});

describe("capSeriesWithOther", () => {
  const mk = (...values: number[]) => values.map((value, i) => ({ label: `s${i}`, value }));

  it("returns a copy unchanged when within the cap", () => {
    const items = mk(3, 2, 1);
    const result = capSeriesWithOther(items);
    expect(result).toEqual(items);
    expect(result).not.toBe(items);
    expect(capSeriesWithOther(mk(1, 2, 3, 4, 5, 6))).toHaveLength(6);
  });

  it("handles empty input", () => {
    expect(capSeriesWithOther([])).toEqual([]);
  });

  it("groups the tail into Other so the result has at most max slices", () => {
    const result = capSeriesWithOther(mk(10, 9, 8, 7, 6, 5, 4, 3));
    expect(result).toHaveLength(6);
    expect(result.map((r) => r.label)).toEqual(["s0", "s1", "s2", "s3", "s4", "Other"]);
    expect(result[5]?.value).toBe(5 + 4 + 3);
  });

  it("ranks by value, keeping the largest regardless of input order", () => {
    const result = capSeriesWithOther(mk(1, 50, 2, 40, 3, 30, 4), 3);
    expect(result.map((r) => r.value)).toEqual([50, 40, 1 + 2 + 3 + 30 + 4]);
  });

  it("breaks ties by input order", () => {
    const result = capSeriesWithOther(mk(5, 5, 5, 5), 3);
    expect(result.map((r) => r.label)).toEqual(["s0", "s1", "Other"]);
    expect(result[2]?.value).toBe(10);
  });

  it("supports a custom max and label, and clamps max to at least 1", () => {
    expect(capSeriesWithOther(mk(3, 2, 1), 2, "Rest").map((r) => r.label)).toEqual(["s0", "Rest"]);
    expect(capSeriesWithOther(mk(3, 2, 1), 0)).toEqual([{ label: "Other", value: 6 }]);
  });
});

describe("CHART_RULES", () => {
  it("documents the spec rules", () => {
    expect(CHART_RULES.legendMinSeries).toBe(2);
    expect(CHART_RULES.gradientMaxOpacity).toBe(0.15);
    expect(CHART_RULES.donutMaxSlices).toBe(6);
    expect(CHART_RULES.nonColourCueRequired).toBe(true);
    expect(CHART_RULES.colourBy).toBe("entity");
  });
});

describe("DONUT_GEOMETRY", () => {
  it("sweeps a full closed ring from 12 o'clock, clockwise", () => {
    expect(DONUT_GEOMETRY.startAngle).toBe(90);
    expect(Math.abs(DONUT_GEOMETRY.endAngle - DONUT_GEOMETRY.startAngle)).toBe(360);
    expect(DONUT_GEOMETRY.endAngle).toBeLessThan(DONUT_GEOMETRY.startAngle);
  });

  it("never draws a partial ring from an interrupted sweep", () => {
    expect(DONUT_GEOMETRY.isAnimationActive).toBe(false);
  });

  it("keeps small slices wider than the gaps around them", () => {
    expect(DONUT_GEOMETRY.minAngle).toBeGreaterThan(DONUT_GEOMETRY.paddingAngle);
  });
});
