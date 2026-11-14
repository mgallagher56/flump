import { describe, expect, it } from "vitest";
import { formatCompactCurrency, formatCurrency, formatPercent, speakCurrency } from "./currency.js";

describe("formatCurrency", () => {
  it("formats whole pounds by default, with grouping", () => {
    expect(formatCurrency(1234.5)).toBe("£1,235");
    expect(formatCurrency(1234.4, "GBP")).toBe("£1,234");
  });
  it("shows pence with fractionDigits: 2", () => {
    expect(formatCurrency(1234.5, "GBP", { fractionDigits: 2 })).toBe("£1,234.50");
  });
  it("uses the hyphen-minus that Money shows for negatives", () => {
    expect(formatCurrency(-1234)).toBe("-£1,234");
    expect(formatCurrency(-1234.5, "GBP", { fractionDigits: 2 })).toBe("-£1,234.50");
  });
  it("does not show a minus for values that round to zero", () => {
    expect(formatCurrency(-0.001, "GBP", { fractionDigits: 2 })).toBe("£0.00");
    expect(formatCurrency(-0.4)).toBe("£0");
    expect(formatCurrency(-0)).toBe("£0");
  });
  it("renders 0 as £0 but null/undefined as the placeholder", () => {
    expect(formatCurrency(0)).toBe("£0");
    expect(formatCurrency(null)).toBe("Not set");
    expect(formatCurrency(undefined)).toBe("Not set");
    expect(formatCurrency(null, "GBP", { placeholder: "-" })).toBe("-");
  });
  it("gives the placeholder for NaN and Infinity", () => {
    expect(formatCurrency(Number.NaN)).toBe("Not set");
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe("Not set");
    expect(formatCurrency(Number.NEGATIVE_INFINITY, "GBP", { placeholder: "n/a" })).toBe("n/a");
  });
  it("supports other currencies with Intl's en-GB symbols", () => {
    expect(formatCurrency(10, "EUR")).toBe("€10");
    expect(formatCurrency(5, "USD")).toBe("US$5");
  });
  it("falls back to GBP without throwing for malformed or empty codes", () => {
    expect(formatCurrency(5, "not-a-code")).toBe("£5");
    expect(formatCurrency(-5, "not-a-code")).toBe("-£5");
    expect(formatCurrency(5, "")).toBe("£5");
    expect(() => formatCurrency(5, "ZZZ")).not.toThrow();
  });
  it("compacts large values", () => {
    expect(formatCompactCurrency(950)).toBe("£950");
    expect(formatCompactCurrency(1500)).toBe("£1.5k");
    expect(formatCompactCurrency(250000)).toBe("£250k");
    expect(formatCompactCurrency(1234567)).toBe("£1.2m");
    expect(formatCompactCurrency(2_500_000_000)).toBe("£2.5bn");
    expect(formatCompactCurrency(3_000_000_000_000)).toBe("£3tn");
    expect(formatCompactCurrency(-1500)).toBe("-£1.5k");
    expect(formatCompactCurrency(0)).toBe("£0");
    expect(formatCompactCurrency(null)).toBe("Not set");
    expect(formatCurrency(1500, "GBP", { compact: true })).toBe("£1.5k");
    expect(formatCompactCurrency(1500, "USD")).toBe("US$1.5k");
  });
  it("rounds across unit boundaries when compacting", () => {
    expect(formatCompactCurrency(999.5)).toBe("£999.5");
    expect(formatCompactCurrency(999.96)).toBe("£1k");
    expect(formatCompactCurrency(999_999)).toBe("£1m");
    expect(formatCompactCurrency(999_950)).toBe("£1m");
    expect(formatCompactCurrency(999_950_000)).toBe("£1bn");
    expect(formatCompactCurrency(-0.04)).toBe("£0");
  });
  it("stays correct after the formatter cache is exercised heavily", () => {
    for (let i = 0; i < 120; i++) formatPercent(1.5, { fractionDigits: i % 20 });
    expect(formatCurrency(1234.5, "GBP", { fractionDigits: 2 })).toBe("£1,234.50");
  });
});

describe("formatPercent", () => {
  it("formats percentage points with fixed digits (0 by default)", () => {
    expect(formatPercent(4.5, { fractionDigits: 1 })).toBe("4.5%");
    expect(formatPercent(4, { fractionDigits: 1 })).toBe("4.0%");
    expect(formatPercent(4.4)).toBe("4%");
    expect(formatPercent(4.567, { fractionDigits: 2 })).toBe("4.57%");
  });
  it("accepts fractions", () => {
    expect(formatPercent(0.045, { fraction: true, fractionDigits: 1 })).toBe("4.5%");
  });
  it("uses the hyphen-minus and the placeholder", () => {
    expect(formatPercent(-2.5, { fractionDigits: 1 })).toBe("-2.5%");
    expect(formatPercent(null)).toBe("Not set");
    expect(formatPercent(Number.NaN, { placeholder: "-" })).toBe("-");
    expect(formatPercent(-0.001)).toBe("0%");
  });
  it("clamps fractionDigits so it never throws", () => {
    expect(() => formatPercent(1.5, { fractionDigits: 100 })).not.toThrow();
    expect(() => formatPercent(1.5, { fractionDigits: -3 })).not.toThrow();
    expect(formatPercent(1.5, { fractionDigits: Number.NaN })).toBe("2%");
    expect(formatPercent(4.56, { fractionDigits: -3 })).toBe("5%");
  });
});

describe("speakCurrency", () => {
  it("speaks pounds and pence", () => {
    expect(speakCurrency(1234.5)).toBe("1,234 pounds and 50 pence");
    expect(speakCurrency(1)).toBe("1 pound");
    expect(speakCurrency(0.01)).toBe("1 penny");
    expect(speakCurrency(0.5)).toBe("50 pence");
    expect(speakCurrency(0)).toBe("0 pounds");
    expect(speakCurrency(2)).toBe("2 pounds");
    expect(speakCurrency(5, "")).toBe("5 pounds");
  });
  it("speaks negatives, placeholders and other currencies", () => {
    expect(speakCurrency(-3.2)).toBe("minus 3 pounds and 20 pence");
    expect(speakCurrency(null)).toBe("not set");
    expect(speakCurrency(Number.NaN)).toBe("not set");
    expect(speakCurrency(5.25, "USD")).toBe("5 dollars and 25 cents");
    expect(speakCurrency(1.01, "EUR")).toBe("1 euro and 1 cent");
    expect(speakCurrency(7, "ZZZ")).toBe("7 ZZZ");
    expect(speakCurrency(7.5, "ZZZ")).toBe("7.50 ZZZ");
  });
});
