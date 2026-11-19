import { describe, expect, it } from "vitest";
import {
  estimateRecordedReturn,
  MIN_RECORDED_RETURN_MONTHS,
  modifiedDietzMonth,
  type RecordedBalance,
} from "./recorded-return.js";

const bal = (year: number, month: number, value: number): RecordedBalance => ({
  year,
  month,
  value,
});

const okResult = (result: ReturnType<typeof estimateRecordedReturn>) => {
  if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
  return result;
};

describe("modifiedDietzMonth", () => {
  it("gives 0 for a month where the only rise is the money paid in", () => {
    // Start 1,000, paid in 100, end 1,100.
    // r = (1100 - 1000 - 100) / (1000 + 0.5 * 100) = 0 / 1050 = 0
    expect(modifiedDietzMonth(1000, 1100, 100)).toBe(0);
  });

  it("gives 1% for a plain 1% month", () => {
    // Start 1,000, nothing paid in, end 1,010.
    // r = (1010 - 1000 - 0) / (1000 + 0) = 10 / 1000 = 0.01
    expect(modifiedDietzMonth(1000, 1010, 0)).toBeCloseTo(0.01, 12);
  });

  it("gives a negative return when the value falls", () => {
    // Start 1,000, nothing paid in, end 950: r = -50 / 1000 = -0.05
    expect(modifiedDietzMonth(1000, 950, 0)).toBeCloseTo(-0.05, 12);
    // Start 1,000, paid in 100, end 1,047.50:
    // r = (1047.5 - 1000 - 100) / (1000 + 50) = -52.5 / 1050 = -0.05
    expect(modifiedDietzMonth(1000, 1047.5, 100)).toBeCloseTo(-0.05, 12);
  });

  it("has no return when the starting value is not positive", () => {
    // 0 + 0.5 * 0 = 0: nothing to grow.
    expect(modifiedDietzMonth(0, 100, 0)).toBeNull();
  });
});

describe("estimateRecordedReturn", () => {
  it("needs at least 3 months in a row", () => {
    expect(MIN_RECORDED_RETURN_MONTHS).toBe(3);
    expect(estimateRecordedReturn({ balances: [] })).toEqual({
      status: "not-enough-history",
      minimumMonths: 3,
    });
    // Two months: one monthly return only.
    expect(
      estimateRecordedReturn({ balances: [bal(2026, 1, 1000), bal(2026, 2, 1010)] }).status,
    ).toBe("not-enough-history");
    // Four months, but split by a gap into two pairs: no run of 3.
    expect(
      estimateRecordedReturn({
        balances: [bal(2026, 1, 1000), bal(2026, 2, 1010), bal(2026, 4, 1020), bal(2026, 5, 1030)],
      }).status,
    ).toBe("not-enough-history");
  });

  it("gives 0 when every rise is the money paid in", () => {
    // 1,000 -> 1,100 -> 1,200 with 100 paid in each month: each month (+100 - 100) / 1050 and
    // (+100 - 100) / 1150 = 0, so the chained return is 0.
    const result = okResult(
      estimateRecordedReturn({
        balances: [bal(2026, 1, 1000), bal(2026, 2, 1100), bal(2026, 3, 1200)],
        monthlyContribution: 100,
      }),
    );
    expect(result.overall).toEqual({ months: 2, annualised: false, return: 0 });
    expect(result.monthlyContribution).toBe(100);
  });

  it("skips a missing month instead of inventing a balance", () => {
    // Jan 1,000 -> Feb 1,010: +1%. March missing, so Feb -> Apr is not measured.
    // Apr 2,000 -> May 2,020: +1%. May 2,020 -> Jun 2,040.20: +1% (2020 * 1.01 = 2040.2).
    // Three monthly returns of 1%: 1.01^3 - 1 = 1.030301 - 1 = 0.030301.
    const result = okResult(
      estimateRecordedReturn({
        balances: [
          bal(2026, 1, 1000),
          bal(2026, 2, 1010),
          bal(2026, 4, 2000),
          bal(2026, 5, 2020),
          bal(2026, 6, 2040.2),
        ],
      }),
    );
    expect(result.overall.months).toBe(3);
    expect(result.overall.annualised).toBe(false);
    expect(result.overall.return).toBeCloseTo(0.030301, 10);
    // Had the gap been bridged, the 1,010 -> 2,000 jump would have counted as growth.
  });

  it("gives a negative figure for a fall, with no other marker", () => {
    // 1,000 -> 950 (-5%) -> 902.50 (-5%, 950 * 0.95 = 902.5).
    // 0.95 * 0.95 - 1 = 0.9025 - 1 = -0.0975
    const result = okResult(
      estimateRecordedReturn({
        balances: [bal(2026, 3, 1000), bal(2026, 4, 950), bal(2026, 5, 902.5)],
      }),
    );
    expect(result.overall.return).toBeCloseTo(-0.0975, 10);
    expect(result.years).toEqual([{ year: 2026, months: 2, return: result.overall.return }]);
  });

  it("splits returns into calendar years by the later month", () => {
    // Nov 2024 1,000 -> Dec 2024 1,010: +1%, counts in 2024.
    // Dec 2024 1,010 -> Jan 2025 1,030.20: +2% (1010 * 1.02 = 1030.2), counts in 2025.
    // Jan 2025 1,030.20 -> Feb 2025 1,019.898: -1% (1030.2 * 0.99 = 1019.898), counts in 2025.
    // 2024: 0.01 over 1 month. 2025: 1.02 * 0.99 - 1 = 1.0098 - 1 = 0.0098 over 2 months.
    // Given out of order to show the input is sorted.
    const result = okResult(
      estimateRecordedReturn({
        balances: [
          bal(2025, 2, 1019.898),
          bal(2024, 11, 1000),
          bal(2025, 1, 1030.2),
          bal(2024, 12, 1010),
        ],
      }),
    );
    expect(result.years.map((y) => [y.year, y.months])).toEqual([
      [2024, 1],
      [2025, 2],
    ]);
    expect(result.years[0]?.return).toBeCloseTo(0.01, 10);
    expect(result.years[1]?.return).toBeCloseTo(0.0098, 10);
    // Overall: 1.01 * 1.02 * 0.99 - 1 = 1.019898 - 1 = 0.019898, not annualised (3 months).
    expect(result.overall.return).toBeCloseTo(0.019898, 10);
  });

  it("annualises the overall figure from 12 months measured", () => {
    // 25 balances from Jan 2024 to Jan 2026: 24 monthly returns. The 12 returns Feb 2024 to
    // Jan 2025 are +1% each; the 12 returns Feb 2025 to Jan 2026 are 0%.
    // Total growth 1.01^12 = 1.126825030131969 (bc). Annualised over 24 months:
    // 1.126825030131969^(12/24) = sqrt(1.126825030131969) = 1.061520150600999 (bc), so 6.152%.
    // 2024 holds Feb to Dec: 11 months of +1%, 1.01^11 - 1 = 1.115668346665316 - 1 (bc).
    // 2025 holds Jan (+1%) and Feb to Dec (0%): 12 months, 1.01 - 1 = 0.01.
    // 2026 holds Jan (0%): 1 month, 0.
    const balances: RecordedBalance[] = [];
    let value = 1000;
    for (let i = 0; i <= 24; i++) {
      if (i > 0 && i <= 12) value *= 1.01;
      balances.push(bal(2024 + Math.floor(i / 12), (i % 12) + 1, value));
    }
    const result = okResult(estimateRecordedReturn({ balances, monthlyContribution: null }));
    expect(result.overall.months).toBe(24);
    expect(result.overall.annualised).toBe(true);
    expect(result.overall.return).toBeCloseTo(0.061520150600999, 10);
    expect(result.years.map((y) => [y.year, y.months])).toEqual([
      [2024, 11],
      [2025, 12],
      [2026, 1],
    ]);
    expect(result.years[0]?.return).toBeCloseTo(0.115668346665316, 10);
    expect(result.years[1]?.return).toBeCloseTo(0.01, 10);
    expect(result.years[2]?.return).toBeCloseTo(0, 10);
    expect(result.monthlyContribution).toBe(0);
  });

  it("removes the effect of a large payment (time-weighted)", () => {
    // Jan 1,000 -> Feb 1,060 with 50 paid in: (1060 - 1000 - 50) / (1000 + 25) = 10 / 1025.
    // Feb 1,060 -> Mar 1,120.50 with 50 paid in: (1120.5 - 1060 - 50) / (1060 + 25)
    //   = 10.5 / 1085.
    // Chained: (1 + 10/1025) * (1 + 10.5/1085) - 1
    //   = (1035/1025) * (1095.5/1085) - 1 = 1133842.5 / 1112125 - 1 = 21717.5 / 1112125
    //   = 0.019527930763... (long division: 21717.5 / 1112125).
    const result = okResult(
      estimateRecordedReturn({
        balances: [bal(2026, 1, 1000), bal(2026, 2, 1060), bal(2026, 3, 1120.5)],
        monthlyContribution: 50,
      }),
    );
    expect(result.overall.return).toBeCloseTo(0.0195279308, 8);
  });
});
