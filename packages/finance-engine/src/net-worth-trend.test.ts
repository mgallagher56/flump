import { describe, expect, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "./net-worth-basis.js";
import {
  NET_WORTH_TREND_MAX_BARS,
  NET_WORTH_TREND_MIN_BARS,
  selectNetWorthTrend,
} from "./net-worth-trend.js";
import { selectNetWorthSeries } from "./snapshots.js";

const rec = (month: string, netWorth: number) => ({ month, netWorth, allCarried: false });
const carried = (month: string, netWorth: number) => ({ month, netWorth, allCarried: true });

/** month, top, height of each bar: the geometry alone. */
const geometry = (trend: ReturnType<typeof selectNetWorthTrend>) =>
  trend?.bars.map((b) => [b.month, b.top, b.height]);

describe("selectNetWorthTrend", () => {
  it("draws positive months up from a zero line at the bottom", () => {
    // Range 0 to 4,000 (span 4,000). 1,000 is a quarter: top 75, height 25. 2,000 is half: top 50,
    // height 50. 4,000 fills it: top 0, height 100. Zero sits at the bottom (4,000 / 4,000 = 100).
    const trend = selectNetWorthTrend([
      rec("2026-09", 1000),
      rec("2026-10", 2000),
      rec("2026-11", 4000),
    ]);
    expect(trend?.zeroLine).toBe(100);
    expect(geometry(trend)).toEqual([
      ["2026-09", 75, 25],
      ["2026-10", 50, 50],
      ["2026-11", 0, 100],
    ]);
  });

  it("starts at zero, not at the smallest month, so a small change looks small", () => {
    // 10,000 then 10,500 then 11,000: range 0 to 11,000. Heights 10,000/11,000 = 90.91%,
    // 10,500/11,000 = 95.45%, 100%. A cropped scale would have drawn the first bar at 0.
    const trend = selectNetWorthTrend([
      rec("2026-09", 10000),
      rec("2026-10", 10500),
      rec("2026-11", 11000),
    ]);
    expect(geometry(trend)).toEqual([
      ["2026-09", 9.09, 90.91],
      ["2026-10", 4.55, 95.45],
      ["2026-11", 0, 100],
    ]);
  });

  it("hangs negative months down from a zero line at the top", () => {
    // Range -4,000 to 0 (span 4,000). Zero at the top (0 / 4,000). -4,000 fills it (height 100),
    // -2,000 is half (50), -1,000 a quarter (25); each starts at the zero line, top 0.
    const trend = selectNetWorthTrend([
      rec("2026-09", -4000),
      rec("2026-10", -2000),
      rec("2026-11", -1000),
    ]);
    expect(trend?.zeroLine).toBe(0);
    expect(geometry(trend)).toEqual([
      ["2026-09", 0, 100],
      ["2026-10", 0, 50],
      ["2026-11", 0, 25],
    ]);
  });

  it("puts the zero line part way up when months are negative and positive", () => {
    // Range -1,000 to 3,000 (span 4,000). Zero is 3,000 / 4,000 = 75% down.
    // -1,000: starts at the zero line (top 75), height 25. 1,000: top (3,000-1,000)/4,000 = 50,
    // height 25. 3,000: top 0, height 75.
    const trend = selectNetWorthTrend([
      rec("2026-09", -1000),
      rec("2026-10", 1000),
      rec("2026-11", 3000),
    ]);
    expect(trend?.zeroLine).toBe(75);
    expect(geometry(trend)).toEqual([
      ["2026-09", 75, 25],
      ["2026-10", 50, 25],
      ["2026-11", 0, 75],
    ]);
  });

  it("draws a month at exactly zero as no bar on the zero line", () => {
    // Range 0 to 2,000. 0 has height 0 and its top on the zero line (100).
    const trend = selectNetWorthTrend([
      rec("2026-09", 0),
      rec("2026-10", 1000),
      rec("2026-11", 2000),
    ]);
    expect(geometry(trend)?.[0]).toEqual(["2026-09", 100, 0]);
  });

  it("keeps the last seven recorded months and marks only the last as latest", () => {
    const series = Array.from({ length: 9 }, (_, i) => rec(`2026-0${i + 1}`, (i + 1) * 100));
    const trend = selectNetWorthTrend(series);
    expect(trend?.bars.map((b) => b.month)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(trend?.bars.map((b) => b.latest)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(NET_WORTH_TREND_MAX_BARS).toBe(7);
  });

  it("skips carried months and counts them as missed before the next bar", () => {
    // Recorded May, June, September; July and August are carried: two months missed before
    // September, none before June (consecutive) or May (the first bar).
    const trend = selectNetWorthTrend([
      rec("2026-05", 1000),
      rec("2026-06", 1100),
      carried("2026-07", 1100),
      carried("2026-08", 1100),
      rec("2026-09", 1300),
      carried("2026-10", 1300),
    ]);
    expect(trend?.bars.map((b) => [b.month, b.missedBefore])).toEqual([
      ["2026-05", null],
      ["2026-06", null],
      ["2026-09", { from: "2026-07", to: "2026-08", count: 2 }],
    ]);
    expect(trend?.bars.at(-1)?.latest).toBe(true);
  });

  it("counts missed months across a year end", () => {
    // November 2025 to February 2026: December and January missed.
    const trend = selectNetWorthTrend([
      rec("2025-10", 100),
      rec("2025-11", 200),
      rec("2026-02", 300),
    ]);
    expect(trend?.bars.at(-1)?.missedBefore).toEqual({ from: "2025-12", to: "2026-01", count: 2 });
  });

  it("is null below three recorded months, carried months not counted", () => {
    expect(NET_WORTH_TREND_MIN_BARS).toBe(3);
    expect(selectNetWorthTrend([])).toBeNull();
    expect(selectNetWorthTrend([rec("2026-10", 100)])).toBeNull();
    expect(
      selectNetWorthTrend([rec("2026-10", 100), carried("2026-11", 100), rec("2026-12", 200)]),
    ).toBeNull();
    expect(
      selectNetWorthTrend([rec("2026-09", 100), rec("2026-10", 200), rec("2026-11", 300)])?.bars,
    ).toHaveLength(3);
  });

  it("is null for a flat series, including every month at zero", () => {
    expect(
      selectNetWorthTrend([rec("2026-09", 500), rec("2026-10", 500), rec("2026-11", 500)]),
    ).toBeNull();
    expect(
      selectNetWorthTrend([rec("2026-09", 0), rec("2026-10", 0), rec("2026-11", 0)]),
    ).toBeNull();
  });

  it("sorts its input, keeps the last of a duplicate month and skips invalid points", () => {
    // October appears twice: 900 wins. "2026-13", the two padded months and the NaN point are
    // skipped.
    // Range 0 to 900: September 300 is a third (height 33.33), October 900 is full, November 600
    // is two thirds (66.67).
    const trend = selectNetWorthTrend([
      rec("2026-11", 600),
      rec("2026-10", 100),
      rec("2026-13", 5000),
      rec("2026-12", Number.NaN),
      rec("2026-09", 300),
      rec("2026-10", 900),
      // After October, so a loose month pattern would read these as October and replace 900.
      rec("x2026-10", 7000),
      rec("2026-10x", 7000),
    ]);
    expect(geometry(trend)).toEqual([
      ["2026-09", 66.67, 33.33],
      ["2026-10", 0, 100],
      ["2026-11", 33.33, 66.67],
    ]);
    expect(trend?.bars.map((b) => b.netWorth)).toEqual([300, 900, 600]);
  });

  it("honours a smaller maxBars", () => {
    const trend = selectNetWorthTrend(
      [rec("2026-07", 1), rec("2026-08", 2), rec("2026-09", 3), rec("2026-10", 4)],
      3,
    );
    expect(trend?.bars.map((b) => b.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("reads the joint-share net worth from selectNetWorthSeries", () => {
    // A joint current account at the default 50% share: 2,000, 3,000 and 4,000 recorded count as
    // 1,000, 1,500 and 2,000. Range 0 to 2,000: heights 50, 75 and 100.
    const series = selectNetWorthSeries(
      [{ id: "a", type: "Current Account", ownership: "joint" }],
      [
        { accountId: "a", year: 2026, month: 9, value: 2000 },
        { accountId: "a", year: 2026, month: 10, value: 3000 },
        { accountId: "a", year: 2026, month: 11, value: 4000 },
      ],
      DEFAULT_NET_WORTH_BASIS,
    );
    const trend = selectNetWorthTrend(series);
    expect(trend?.bars.map((b) => [b.netWorth, b.height])).toEqual([
      [1000, 50],
      [1500, 75],
      [2000, 100],
    ]);
  });
});
