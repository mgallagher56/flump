// @vitest-environment node
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

describe("niceStep boundaries", () => {
  it.each([
    [2, 2],
    [2.5, 2.5],
    [5, 5],
  ])("keeps %d as %d", (raw, nice) => {
    expect(niceStep(raw)).toBe(nice);
  });
});

describe("formatMonthTick input checks", () => {
  it("draws nothing for text around a month key", () => {
    expect(formatMonthTick("x2026-09")).toBe("");
    expect(formatMonthTick("2026-09x")).toBe("");
  });
});

describe("niceYDomain worked examples", () => {
  it("starts at zero for data that starts at zero", () => {
    // Span 100, pad 10, top 110. Step: 110 / 4 = 27.5, rounded up to 50. Top: 150.
    expect(niceYDomain([0, 100])).toEqual([0, 150]);
    expect(niceYDomain([-100, 0])).toEqual([-150, 0]);
  });

  it("anchors at zero when the nearest value is exactly a quarter of the largest", () => {
    // 2,500 is 25% of 10,000, so the low end is 0. Pad 750, top 10,750. Step 1,075 rounds to
    // 2,000, so the top is 12,000. Without the anchor the domain would be [1,000, 11,000].
    expect(niceYDomain([2_500, 10_000], { tickCount: 10 })).toEqual([0, 12_000]);
    expect(niceYDomain([-10_000, -2_500], { tickCount: 10 })).toEqual([-12_000, 0]);
  });

  it("anchors at zero for data well inside the near-zero share", () => {
    // 2,000 is 20% of 10,000. Pad 800, top 10,800, step 1,080 rounds to 2,000: [0, 12,000].
    expect(niceYDomain([2_000, 10_000], { tickCount: 10 })).toEqual([0, 12_000]);
    expect(niceYDomain([-10_000, -2_000], { tickCount: 10 })).toEqual([-12_000, 0]);
  });

  it("measures near zero against the largest value, not the smallest", () => {
    // Largest 18,000: 4,500 is 25% of it, so the low end is 0. Pad 1,350, top 19,350.
    // Step 1,935 rounds to 2,000: [0, 20,000].
    expect(niceYDomain([4_500, 18_000], { tickCount: 10 })).toEqual([0, 20_000]);
  });

  it("pads a flat series by a tenth of its value", () => {
    // Pad 5,000 either side: 45,000 to 55,000. Step 10,000 / 4 = 2,500.
    expect(niceYDomain([50_000, 50_000, 50_000])).toEqual([45_000, 55_000]);
  });

  it("clamps large padding at zero for one-signed data", () => {
    // Pad 70 (padRatio 1) would take 30 to -40; clamped to 0. Top 170, step 42.5 rounds to 50.
    expect(niceYDomain([30, 100], { padRatio: 1 })).toEqual([0, 200]);
    expect(niceYDomain([-100, -30], { padRatio: 1 })).toEqual([-200, 0]);
  });

  it("returns a positive zero top for negative data that rounds up to zero", () => {
    // 300 is 30% of 1,000, so no anchor. Pad 70: -1,070 to -230. Step 840 / 4 = 210 rounds to
    // 250. Low: floor(-4.28) x 250 = -1,250. Math.ceil(-230 / 250) is -0, normalised to 0.
    const [lo, hi] = niceYDomain([-1_000, -300]);
    expect(lo).toBe(-1_250);
    expect(Object.is(hi, 0)).toBe(true);
  });
});
