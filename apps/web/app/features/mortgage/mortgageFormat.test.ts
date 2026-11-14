import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatIsoMonthYear,
  formatRate,
  formatYearsLeft,
  rateFractionDigits,
} from "./mortgageFormat";

describe("mortgageFormat", () => {
  it("writes durations as years and months (copy guide 4.3)", () => {
    expect(formatYearsLeft(218 / 12)).toBe("18 years 2 months");
    expect(formatDuration(24)).toBe("2 years");
    expect(formatDuration(13)).toBe("1 year 1 month");
    expect(formatDuration(0)).toBe("0 months");
  });

  it("shows rates as entered, with at most 2 fraction digits", () => {
    expect(formatRate(4.5)).toBe("4.5%");
    expect(formatRate(4)).toBe("4%");
    expect(formatRate(4.25)).toBe("4.25%");
    expect(rateFractionDigits(4.5)).toBe(1);
    expect(rateFractionDigits(4)).toBe(0);
    expect(rateFractionDigits(4.25)).toBe(2);
  });

  it("never writes Sept", () => {
    expect(formatIsoMonthYear("2028-09-01")).toBe("Sep 2028");
    expect(formatIsoMonthYear("not a date")).toBeNull();
  });
});
