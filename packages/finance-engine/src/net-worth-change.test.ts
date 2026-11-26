// @vitest-environment node
import { describe, expect, it } from "vitest";
import { selectNetWorthChange } from "./net-worth-change.js";

const rec = (month: string, netWorth: number) => ({ month, netWorth, allCarried: false });
const carried = (month: string, netWorth: number) => ({ month, netWorth, allCarried: true });

describe("selectNetWorthChange", () => {
  it("compares today's figure with the latest recorded month before this one, in whole pounds", () => {
    // October 1,500.60 rounds to 1,501; today 1,820.20 rounds to 1,820; 1,820 - 1,501 = 319.
    // November is the current month, so its row is not the comparison.
    const series = [rec("2026-09", 1000.4), rec("2026-10", 1500.6), rec("2026-11", 9999)];
    expect(selectNetWorthChange(1820.2, series, "2026-11")).toEqual({
      priorMonth: "2026-10",
      change: 319,
    });
  });

  it("skips a carried month and reads a fall as a negative change", () => {
    // October is carried, so September (1,000) is the comparison: 900 - 1,000 = -100.
    const series = [rec("2026-09", 1000), carried("2026-10", 1200)];
    expect(selectNetWorthChange(900, series, "2026-11")).toEqual({
      priorMonth: "2026-09",
      change: -100,
    });
  });

  it("finds the latest month in an unsorted series", () => {
    // August 50 and October 300 recorded; October is latest: 400 - 300 = 100.
    const series = [rec("2026-10", 300), rec("2026-08", 50)];
    expect(selectNetWorthChange(400, series, "2026-11")?.priorMonth).toBe("2026-10");
  });

  it("is zero, never minus zero, when the rounded figures are the same", () => {
    // 1,000.40 and 999.60 both round to 1,000.
    const result = selectNetWorthChange(1000.4, [rec("2026-10", 999.6)], "2026-11");
    expect(result?.change).toBe(0);
    expect(Object.is(result?.change, -0)).toBe(false);
  });

  it("is null with no earlier recorded month", () => {
    expect(selectNetWorthChange(500, [rec("2026-11", 400)], "2026-11")).toBeNull();
    expect(selectNetWorthChange(500, [carried("2026-10", 400)], "2026-11")).toBeNull();
    expect(selectNetWorthChange(500, [], "2026-11")).toBeNull();
  });

  it("is null when today's figure or the earlier one is unknown", () => {
    expect(selectNetWorthChange(null, [rec("2026-10", 400)], "2026-11")).toBeNull();
    expect(selectNetWorthChange(Number.NaN, [rec("2026-10", 400)], "2026-11")).toBeNull();
    expect(
      selectNetWorthChange(500, [rec("2026-10", Number.POSITIVE_INFINITY)], "2026-11"),
    ).toBeNull();
  });

  it("ignores a point whose month is not YYYY-MM", () => {
    // "2025-13" is not a month, so September (200) is the comparison: 500 - 200 = 300.
    expect(selectNetWorthChange(500, [rec("2025-13", 1), rec("2026-09", 200)], "2026-11")).toEqual({
      priorMonth: "2026-09",
      change: 300,
    });
  });
});
