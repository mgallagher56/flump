import { calculateTaxTrapRelief } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { formatTrapRate, getTaxTrapCopy } from "./taxTrapCopy";

describe("taxTrapCopy", () => {
  it("formats whole and fractional rates in en-GB", () => {
    expect(formatTrapRate(60)).toBe("60%");
    expect(formatTrapRate(62)).toBe("62%");
    expect(formatTrapRate(67.5)).toBe("67.5%");
  });

  it("reads both named engine rates for England, Wales and NI", () => {
    const analysis = calculateTaxTrapRelief(110000);
    const copy = getTaxTrapCopy(analysis);

    expect(copy.incomeTaxRate).toBe(formatTrapRate(analysis.marginalRatePct));
    expect(copy.effectiveRate).toBe(formatTrapRate(analysis.effectiveMarginalRatePct));
    expect(copy.breakdown).toBe("60% income tax, 62% including NI");
  });

  it("follows the engine when the rates differ (Scotland)", () => {
    const analysis = calculateTaxTrapRelief(110000, undefined, "SCOTLAND");
    const copy = getTaxTrapCopy(analysis);

    expect(copy.breakdown).toBe(
      `${formatTrapRate(analysis.marginalRatePct)} income tax, ${formatTrapRate(
        analysis.effectiveMarginalRatePct,
      )} including NI`,
    );
    expect(copy.breakdown).not.toBe("60% income tax, 62% including NI");
  });
});
