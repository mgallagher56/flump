import { describe, expect, it } from "vitest";
import {
  CHART_AXIS_DEFAULTS,
  formatMonthTick,
  niceStep,
  niceYDomain,
  normaliseMonthAbbreviation,
  xTickAnchor,
} from "./axisDefaults";

describe("formatMonthTick", () => {
  it('writes September as "Sep", never "Sept"', () => {
    expect(formatMonthTick("2026-09")).toBe("Sep 2026");
    expect(formatMonthTick("2026-09-15", "2-digit")).toBe("Sep 26");
    expect(formatMonthTick(new Date(Date.UTC(2026, 8, 1)), "none")).toBe("Sep");
  });

  it("formats every month with three letters in en-GB", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatMonthTick(`2026-${String(i + 1).padStart(2, "0")}`, "none"),
    );
    expect(months).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });

  it("reads a month key in UTC so it never shifts a month", () => {
    expect(formatMonthTick("2029-12")).toBe("Dec 2029");
    expect(formatMonthTick("2026-01")).toBe("Jan 2026");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatMonthTick("not a date")).toBe("");
    expect(formatMonthTick(Number.NaN)).toBe("");
  });

  it("normalises Sept in any label", () => {
    expect(normaliseMonthAbbreviation("Sept 2026")).toBe("Sep 2026");
    expect(normaliseMonthAbbreviation("1 Sept to 30 Sept")).toBe("1 Sep to 30 Sep");
    expect(normaliseMonthAbbreviation("September")).toBe("September");
  });
});

describe("xTickAnchor", () => {
  it("ends the last tick at the plot edge", () => {
    expect(xTickAnchor(5, 6)).toBe("end");
    expect(xTickAnchor(0, 6)).toBe("middle");
    expect(xTickAnchor(3, 6)).toBe("middle");
    expect(xTickAnchor(0, 1)).toBe("middle");
  });

  it("reserves room right of the plot and offsets direct labels off the line end", () => {
    expect(CHART_AXIS_DEFAULTS.plotPaddingRight).toBeGreaterThan(0);
    expect(CHART_AXIS_DEFAULTS.directLabelOffset.dx).toBeGreaterThan(0);
    expect(CHART_AXIS_DEFAULTS.directLabelOffset.dy).toBeLessThan(0);
    expect(CHART_AXIS_DEFAULTS.maxXTicks).toBe(6);
  });
});

describe("niceStep", () => {
  it.each([
    [0.7, 1],
    [1, 1],
    [1.5, 2],
    [2.2, 2.5],
    [3, 5],
    [7, 10],
    [13_000, 20_000],
    [24_000, 25_000],
  ])("rounds %d up to %d", (raw, nice) => {
    expect(niceStep(raw)).toBe(nice);
  });

  it("falls back to 1 for zero, negative or non-finite input", () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
    expect(niceStep(Number.NaN)).toBe(1);
  });
});

describe("niceYDomain", () => {
  it("sits near the data when every value is far from zero", () => {
    const [lo, hi] = niceYDomain([182_000, 196_500, 214_000, 238_000]);
    expect(lo).toBeGreaterThan(0);
    expect(lo).toBeLessThanOrEqual(182_000);
    expect(hi).toBeGreaterThanOrEqual(238_000);
    expect(lo).toBe(160_000);
    expect(hi).toBe(260_000);
  });

  it("keeps zero when the data comes near zero", () => {
    expect(niceYDomain([1_200, 8_000, 20_000])[0]).toBe(0);
  });

  it("keeps zero inside the domain when the data crosses it", () => {
    const [lo, hi] = niceYDomain([-4_000, 2_000, 12_000]);
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(12_000);
  });

  it("mirrors the rule for negative data", () => {
    expect(niceYDomain([-20_000, -9_000, -1_000])[1]).toBe(0);
    const [lo, hi] = niceYDomain([-240_000, -200_000]);
    expect(hi).toBeLessThan(0);
    expect(lo).toBeLessThanOrEqual(-240_000);
  });

  it("never pads one-signed data across zero", () => {
    const [lo] = niceYDomain([30, 100]);
    expect(lo).toBeGreaterThanOrEqual(0);
  });

  it("gives a flat series some height", () => {
    const [lo, hi] = niceYDomain([50_000, 50_000, 50_000]);
    expect(lo).toBeLessThan(50_000);
    expect(hi).toBeGreaterThan(50_000);
  });

  it("ignores non-finite values and falls back to [0, 1] when none are left", () => {
    expect(niceYDomain([null, undefined, Number.NaN])).toEqual([0, 1]);
    expect(niceYDomain([])).toEqual([0, 1]);
    expect(niceYDomain([0, 0])).toEqual([0, 1]);
  });

  it("never returns negative zero", () => {
    const [, hi] = niceYDomain([-500, -100]);
    expect(Object.is(hi, -0)).toBe(false);
  });
});
