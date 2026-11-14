import { describe, expect, it } from "vitest";
import { formatPayoffDuration, interestInFirstYear } from "./payoffFormat";

describe("formatPayoffDuration", () => {
  it("reads months under 24 and years and months from 24", () => {
    expect(formatPayoffDuration(1)).toBe("1 month");
    expect(formatPayoffDuration(18)).toBe("18 months");
    expect(formatPayoffDuration(24)).toBe("2 years");
    expect(formatPayoffDuration(40)).toBe("3 years 4 months");
    expect(formatPayoffDuration(-3)).toBe("0 months");
  });
});

describe("interestInFirstYear", () => {
  it("sums months 1 to 12 only", () => {
    const schedule = Array.from({ length: 15 }, (_, i) => ({
      month: i + 1,
      totalInterestPaidThisMonth: 10,
    }));
    expect(interestInFirstYear(schedule)).toBe(120);
    expect(interestInFirstYear([])).toBe(0);
  });
});
