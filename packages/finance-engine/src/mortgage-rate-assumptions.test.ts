import { describe, expect, it } from "vitest";
import {
  isMortgageRateTableStale,
  lookupMortgageRateBandForLtv,
  MORTGAGE_LTV_RATE_BANDS,
  MORTGAGE_RATE_STALE_AFTER_MONTHS,
  MORTGAGE_RATE_TABLE_AS_OF,
} from "./mortgage-rate-assumptions.js";

describe("mortgage rate assumptions (E39 MA5)", () => {
  it("pins the November 2026 rate table and 6-month staleness window", () => {
    expect(MORTGAGE_RATE_TABLE_AS_OF).toBe("2026-11");
    expect(MORTGAGE_RATE_STALE_AFTER_MONTHS).toBe(6);
    expect(MORTGAGE_LTV_RATE_BANDS).toEqual([
      { maxLtvPct: 60, lowAnnualRatePct: 4.24, highAnnualRatePct: 4.44 },
      { maxLtvPct: 70, lowAnnualRatePct: 4.32, highAnnualRatePct: 4.61 },
      { maxLtvPct: 80, lowAnnualRatePct: 4.41, highAnnualRatePct: 4.77 },
      { maxLtvPct: 90, lowAnnualRatePct: 4.49, highAnnualRatePct: 4.94 },
    ]);
  });

  describe("lookupMortgageRateBandForLtv", () => {
    it("returns the matching band on every boundary and just above/below", () => {
      // <= 60%
      expect(lookupMortgageRateBandForLtv(50)).toEqual({
        maxLtvPct: 60,
        lowAnnualRatePct: 4.24,
        highAnnualRatePct: 4.44,
      });
      expect(lookupMortgageRateBandForLtv(60)).toEqual({
        maxLtvPct: 60,
        lowAnnualRatePct: 4.24,
        highAnnualRatePct: 4.44,
      });
      // > 60% to 70%
      expect(lookupMortgageRateBandForLtv(60.01)).toEqual({
        maxLtvPct: 70,
        lowAnnualRatePct: 4.32,
        highAnnualRatePct: 4.61,
      });
      expect(lookupMortgageRateBandForLtv(70)).toEqual({
        maxLtvPct: 70,
        lowAnnualRatePct: 4.32,
        highAnnualRatePct: 4.61,
      });
      // > 70% to 80%
      expect(lookupMortgageRateBandForLtv(70.01)).toEqual({
        maxLtvPct: 80,
        lowAnnualRatePct: 4.41,
        highAnnualRatePct: 4.77,
      });
      expect(lookupMortgageRateBandForLtv(80)).toEqual({
        maxLtvPct: 80,
        lowAnnualRatePct: 4.41,
        highAnnualRatePct: 4.77,
      });
      // > 80% to 90%
      expect(lookupMortgageRateBandForLtv(80.01)).toEqual({
        maxLtvPct: 90,
        lowAnnualRatePct: 4.49,
        highAnnualRatePct: 4.94,
      });
      expect(lookupMortgageRateBandForLtv(90)).toEqual({
        maxLtvPct: 90,
        lowAnnualRatePct: 4.49,
        highAnnualRatePct: 4.94,
      });
    });

    it("returns null above 90% LTV and for missing or non-positive inputs", () => {
      expect(lookupMortgageRateBandForLtv(90.01)).toBeNull();
      expect(lookupMortgageRateBandForLtv(95)).toBeNull();
      expect(lookupMortgageRateBandForLtv(0)).toBeNull();
      expect(lookupMortgageRateBandForLtv(-10)).toBeNull();
      expect(lookupMortgageRateBandForLtv(Number.NaN)).toBeNull();
      expect(lookupMortgageRateBandForLtv(null)).toBeNull();
      expect(lookupMortgageRateBandForLtv(undefined)).toBeNull();
    });
  });

  describe("isMortgageRateTableStale", () => {
    it("is false up to and including 6 months after asOf, and true at 7 months", () => {
      // 2026-11 + 5 months = 2027-04 (not stale)
      expect(isMortgageRateTableStale("2027-04-15")).toBe(false);
      // 2026-11 + 6 months = 2027-05 (exact 6-month edge: not > 6 months)
      expect(isMortgageRateTableStale("2027-05-01")).toBe(false);
      expect(isMortgageRateTableStale(new Date(Date.UTC(2027, 4, 31)))).toBe(false);
      // 2026-11 + 7 months = 2027-06 (> 6 months: stale)
      expect(isMortgageRateTableStale("2027-06-01")).toBe(true);
      expect(isMortgageRateTableStale(new Date(Date.UTC(2027, 5, 1)))).toBe(true);
    });

    it("respects a custom asOf year-month and returns true for invalid dates", () => {
      expect(isMortgageRateTableStale("2026-07", "2026-01")).toBe(false);
      expect(isMortgageRateTableStale("2026-08", "2026-01")).toBe(true);
      expect(isMortgageRateTableStale("May 2027")).toBe(false);
      expect(isMortgageRateTableStale("2027-06", "2026-12")).toBe(false);
      expect(isMortgageRateTableStale("not-a-date")).toBe(true);
      expect(isMortgageRateTableStale("2026-13")).toBe(true);
      expect(isMortgageRateTableStale("2026-00")).toBe(true);
      expect(isMortgageRateTableStale(new Date(Number.NaN))).toBe(true);
      expect(isMortgageRateTableStale("2026-11", "bad-as-of")).toBe(true);
    });

    it("reads a YYYY-MM(-DD) string by its year and month only, trimmed", () => {
      // Table as of 2026-11. "2027-05-32" is not a real date (new Date gives Invalid Date), but
      // its year and month are 2027-05: 6 months on, not stale. Only the pattern reads it.
      expect(isMortgageRateTableStale("2027-05-32")).toBe(false);
      expect(isMortgageRateTableStale(" 2027-05-32 ")).toBe(false);
      // Text before or after the pattern is not a year-month, and new Date cannot read it either.
      expect(isMortgageRateTableStale("x2027-05")).toBe(true);
      expect(isMortgageRateTableStale("2027-05xyz")).toBe(true);
    });

    it("reads other date strings by their UTC month", () => {
      // 2027-06-01T00:00:00Z is June 2027 in UTC: 2027-06 minus 2026-11 = 7 months > 6, stale.
      expect(isMortgageRateTableStale("2027-06-01T00:00:00Z")).toBe(true);
      // 2027-05-31T23:00:00Z is still May in UTC (June 1st 00:00 in London): 6 months, not stale.
      expect(isMortgageRateTableStale("2027-05-31T23:00:00Z")).toBe(false);
    });
  });
});
