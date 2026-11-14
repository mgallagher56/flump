import { describe, expect, it } from "vitest";
import { monthTicks, yAxisScale } from "./chartAxis";

const NOV_2026 = new Date(2026, 10, 14);

describe("debt chart axis", () => {
  it("ticks each January, years only, when the span is over two years", () => {
    // 37 months from Nov 2026: Januaries 2027 to 2029.
    expect(monthTicks(37, 900, 6, NOV_2026)).toEqual({ ticks: [2, 14, 26], yearsOnly: true });
  });

  it("keeps a narrow plot to at most four year ticks, evenly spaced", () => {
    const { ticks, yearsOnly } = monthTicks(240, 320, 6, NOV_2026);
    expect(yearsOnly).toBe(true);
    expect(ticks.length).toBeLessThanOrEqual(4);
    const gaps = ticks.slice(1).map((t, i) => t - (ticks[i] ?? 0));
    expect(new Set(gaps).size).toBe(1);
  });

  it("keeps a narrow plot to three month ticks up to two years", () => {
    const { ticks, yearsOnly } = monthTicks(18, 320, 6, NOV_2026);
    expect(yearsOnly).toBe(false);
    expect(ticks).toEqual([0, 9, 18]);
  });

  it("allows up to six ticks on a wide or unmeasured plot", () => {
    expect(monthTicks(18, 0, 6, NOV_2026).ticks).toEqual([0, 4, 8, 12, 16]);
  });

  it("gives round, even y ticks that stop within one step of the largest balance", () => {
    expect(yAxisScale([10000, 6000, 0])).toEqual({
      domain: [0, 10000],
      ticks: [0, 2500, 5000, 7500, 10000],
    });
    for (const max of [1350, 8200, 13500, 15000, 47000]) {
      const { ticks, domain } = yAxisScale([max, max / 2, 0]);
      const gaps = ticks.slice(1).map((t, i) => t - (ticks[i] ?? 0));
      expect(new Set(gaps).size).toBe(1);
      expect(ticks[0]).toBe(0);
      expect(domain[1]).toBeGreaterThanOrEqual(max);
      expect(domain[1] - max).toBeLessThan(gaps[0] ?? Number.POSITIVE_INFINITY);
      expect(ticks.length).toBeLessThanOrEqual(6);
    }
  });
});
