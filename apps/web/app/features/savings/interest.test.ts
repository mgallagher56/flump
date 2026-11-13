import { describe, expect, it } from "vitest";
import { calculateOneYearCompoundInterest } from "./interest";

describe("calculateOneYearCompoundInterest", () => {
  it("compounds monthly over a year", () => {
    expect(Math.round(calculateOneYearCompoundInterest(10000, 5, 0))).toBe(512);
  });

  it("is zero at a zero rate", () => {
    expect(calculateOneYearCompoundInterest(10000, 0, 0)).toBe(0);
  });
});
