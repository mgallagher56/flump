import { describe, expect, it } from "vitest";
import { futureValue } from "./futureValue";

describe("futureValue", () => {
  it("compounds monthly with no contributions", () => {
    const { projectedTotal, interestEarned } = futureValue({
      balance: 10000,
      monthlyContribution: 0,
      annualRatePct: 12,
      years: 1,
    });
    // 10000 * 1.01^12
    expect(projectedTotal).toBeCloseTo(11268.25, 2);
    expect(interestEarned).toBeCloseTo(1268.25, 2);
  });

  it("adds level monthly contributions with growth", () => {
    const { projectedTotal, interestEarned } = futureValue({
      balance: 0,
      monthlyContribution: 100,
      annualRatePct: 12,
      years: 1,
    });
    // 100 * (1.01^12 - 1) / 0.01
    expect(projectedTotal).toBeCloseTo(1268.25, 2);
    expect(interestEarned).toBeCloseTo(68.25, 2);
  });

  it("is straight addition at a 0% rate and earns no interest", () => {
    const result = futureValue({
      balance: 1000,
      monthlyContribution: 50,
      annualRatePct: 0,
      years: 3,
    });
    expect(result.projectedTotal).toBe(2800);
    expect(result.interestEarned).toBe(0);
  });

  it("leaves a balance unchanged over zero years", () => {
    const result = futureValue({
      balance: 500,
      monthlyContribution: 20,
      annualRatePct: 5,
      years: 0,
    });
    expect(result.projectedTotal).toBeCloseTo(500, 6);
    expect(result.interestEarned).toBe(0);
  });
});
