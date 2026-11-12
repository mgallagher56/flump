import { describe, expect, it } from "vitest";
import { formatCurrency, formatPercent, speakCurrency } from "./currency.js";

describe("formatCurrency", () => {
  it("formats GBP with grouping and two decimals", () => {
    expect(formatCurrency(1234.5)).toBe("£1,234.50");
    expect(formatCurrency(1234.5, "GBP")).toBe("£1,234.50");
  });
  it("uses a true minus for negatives", () => {
    expect(formatCurrency(-1234.5)).toBe("−£1,234.50");
  });
  it("does not show a minus for values that round to zero", () => {
    expect(formatCurrency(-0.001)).toBe("£0.00");
    expect(formatCurrency(-0)).toBe("£0.00");
  });
  it("renders 0 as £0.00 but null/undefined as the placeholder", () => {
    expect(formatCurrency(0)).toBe("£0.00");
    expect(formatCurrency(null)).toBe("Not set");
    expect(formatCurrency(undefined)).toBe("Not set");
    expect(formatCurrency(null, "GBP", { placeholder: "-" })).toBe("-");
  });
  it("gives the placeholder for NaN and Infinity", () => {
    expect(formatCurrency(Number.NaN)).toBe("Not set");
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe("Not set");
    expect(formatCurrency(Number.NEGATIVE_INFINITY, "GBP", { placeholder: "n/a" })).toBe("n/a");
  });
  it("supports other currencies", () => {
    expect(formatCurrency(10, "EUR")).toBe("€10.00");
  });
  it("falls back without throwing for unknown or malformed codes", () => {
    expect(() => formatCurrency(5, "ZZZ")).not.toThrow();
    expect(formatCurrency(5, "ZZZ")).toContain("5.00");
    expect(() => formatCurrency(5, "not-a-code")).not.toThrow();
    expect(formatCurrency(5, "not-a-code")).toContain("5.00");
    expect(formatCurrency(-5, "not-a-code")).toBe("−NOT-A-CODE 5.00");
  });
  it("compacts large values", () => {
    expect(formatCurrency(950, "GBP", { compact: true })).toBe("£950");
    expect(formatCurrency(1500, "GBP", { compact: true })).toBe("£1.5k");
    expect(formatCurrency(250000, "GBP", { compact: true })).toBe("£250k");
    expect(formatCurrency(1234567, "GBP", { compact: true })).toBe("£1.2m");
    expect(formatCurrency(2_500_000_000, "GBP", { compact: true })).toBe("£2.5bn");
    expect(formatCurrency(-1500, "GBP", { compact: true })).toBe("−£1.5k");
    expect(formatCurrency(999_999, "GBP", { compact: true })).toBe("£1m");
    expect(formatCurrency(0, "GBP", { compact: true })).toBe("£0");
    expect(formatCurrency(null, "GBP", { compact: true })).toBe("Not set");
  });
});

describe("formatPercent", () => {
  it("formats percentage points", () => {
    expect(formatPercent(4.5)).toBe("4.5%");
    expect(formatPercent(4)).toBe("4%");
    expect(formatPercent(4.567, { fractionDigits: 2 })).toBe("4.57%");
  });
  it("accepts fractions", () => {
    expect(formatPercent(0.045, { fraction: true })).toBe("4.5%");
  });
  it("uses a true minus and placeholder", () => {
    expect(formatPercent(-2.5)).toBe("−2.5%");
    expect(formatPercent(null)).toBe("Not set");
    expect(formatPercent(Number.NaN, { placeholder: "-" })).toBe("-");
    expect(formatPercent(-0.001)).toBe("0%");
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
