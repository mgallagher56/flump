import { describe, expect, it } from "vitest";
import { IsoDate, Money, MoneyNonNegative, Percent } from "./primitives.js";

describe("Money", () => {
  it.each([0, 12, 1204.5, -3.25, 0.07, 9999999999.99, 1234567890.12, 8765432109.87])(
    "accepts %s",
    (v) => {
      expect(Money.safeParse(v).success).toBe(true);
    },
  );
  it.each([1.005, 1234567890.125, Number.NaN, Number.POSITIVE_INFINITY, "12", null, 1e10])(
    "rejects %s",
    (v) => {
      expect(Money.safeParse(v).success).toBe(false);
    },
  );
  it("MoneyNonNegative rejects negatives", () => {
    expect(MoneyNonNegative.safeParse(-1).success).toBe(false);
  });
  it("MoneyNonNegative accepts zero: never negative, so £0 is allowed", () => {
    expect(MoneyNonNegative.safeParse(0).success).toBe(true);
  });
});

describe("Percent", () => {
  it("accepts 0 to 100 with two decimals", () => {
    expect(Percent.safeParse(4.5).success).toBe(true);
    expect(Percent.safeParse(100).success).toBe(true);
  });
  it("rejects out of range and over-precise values", () => {
    expect(Percent.safeParse(-0.01).success).toBe(false);
    expect(Percent.safeParse(100.01).success).toBe(false);
    expect(Percent.safeParse(4.555).success).toBe(false);
  });
});

describe("IsoDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(IsoDate.safeParse("2026-04-06").success).toBe(true);
    expect(IsoDate.safeParse("2024-02-29").success).toBe(true);
    expect(IsoDate.safeParse("2026-02-30").success).toBe(false);
    expect(IsoDate.safeParse("2026-4-6").success).toBe(false);
  });
  it("rejects month 13 and month 00, which roll into another year", () => {
    // 2026-13-01 would roll to 2027-01-01 and 2026-00-10 to 2025-12-10: the day still matches,
    // but no calendar has a 13th or 0th month.
    expect(IsoDate.safeParse("2026-13-01").success).toBe(false);
    expect(IsoDate.safeParse("2026-00-10").success).toBe(false);
  });
  it("takes the whole value as YYYY-MM-DD, with nothing before or after the date", () => {
    expect(IsoDate.safeParse("x2026-04-06").success).toBe(false);
    expect(IsoDate.safeParse("2026-04-06x").success).toBe(false);
  });
});
