import { describe, expect, it } from "vitest";
import { capSeriesWithOther } from "./capSeriesWithOther";
import { formatAxisCurrency } from "./formatAxisCurrency";

describe("formatAxisCurrency non-finite options", () => {
  it("falls back to one fraction digit when maxFractionDigits is NaN", () => {
    expect(formatAxisCurrency(1500, { maxFractionDigits: Number.NaN })).toBe("£1.5k");
  });
});

describe("capSeriesWithOther non-finite max", () => {
  it("falls back to 6 when max is NaN", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ label: `s${i}`, value: 8 - i }));
    expect(capSeriesWithOther(items, Number.NaN)).toHaveLength(6);
  });
});
