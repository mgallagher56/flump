import { calculateTaxTrapRelief } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { formatTrapRate, getKnownTrapRegion, getTaxTrapCopy } from "./taxTrapCopy";

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
    expect(copy.breakdown).toBe("60% Income Tax, 62% including National Insurance");
  });

  it("follows the engine when the rates differ (Scotland)", () => {
    const analysis = calculateTaxTrapRelief(110000, undefined, "SCOTLAND");
    const copy = getTaxTrapCopy(analysis);

    expect(copy.incomeTaxRate).toBe("67.5%");
    expect(copy.effectiveRate).toBe("69.5%");
    expect(copy.breakdown).toBe("67.5% Income Tax, 69.5% including National Insurance");
  });

  it("treats a region as known only when the user set it (E23 D-4)", () => {
    expect(getKnownTrapRegion({ ukRegion: "SCOTLAND" })).toBe("SCOTLAND");
    expect(getKnownTrapRegion({ ukRegion: "ENGLAND_NI_WALES" })).toBeNull();
    expect(getKnownTrapRegion({ ukRegion: "ENGLAND_NI_WALES", ukRegionAssumed: true })).toBeNull();
    expect(getKnownTrapRegion({ ukRegion: "ENGLAND_NI_WALES", ukRegionAssumed: false })).toBe(
      "ENGLAND_NI_WALES",
    );
    expect(getKnownTrapRegion(null)).toBeNull();
  });
});
