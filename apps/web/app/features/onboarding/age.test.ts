import { describe, expect, it } from "vitest";
import { birthYearFromAge, isInvalidAge } from "./age";

describe("birthYearFromAge", () => {
  const now = new Date("2026-06-01");
  it("derives a birth year for a whole age from 16 to 100", () => {
    expect(birthYearFromAge(32, now)).toBe(1994);
    expect(birthYearFromAge(16, now)).toBe(2010);
    expect(birthYearFromAge(100, now)).toBe(1926);
  });
  it("leaves it unset for unknown, fractional or out-of-range ages", () => {
    for (const age of [null, 32.5, 15, 101, 0]) expect(birthYearFromAge(age, now)).toBeUndefined();
  });
});

describe("isInvalidAge", () => {
  it("is false for an empty or valid age and true for one that cannot be saved", () => {
    expect(isInvalidAge(null)).toBe(false);
    expect(isInvalidAge(40)).toBe(false);
    for (const age of [15, 101, 32.5, 0]) expect(isInvalidAge(age)).toBe(true);
  });
});
