import { describe, expect, it } from "vitest";
import {
  calculateCompoundTrajectory,
  calculateTaxTrapRelief,
  calculateUKTakeHome,
} from "./wealthCalculators.js";

describe("wealthCalculators", () => {
  it("calculates compound trajectory accurately", () => {
    const res = calculateCompoundTrajectory(10000, 500, 5, 10);
    expect(res.points.length).toBe(11);
    expect(res.points[0].total).toBe(10000);
    expect(res.endBalance).toBeGreaterThan(70000);
    expect(res.totalInterest).toBeGreaterThan(0);
    expect(res.totalContributions).toBe(10000 + 500 * 12 * 10);
  });

  it("detects and calculates UK 60% tax trap for £110k earner", () => {
    const trap = calculateTaxTrapRelief(110000);
    expect(trap.isInTaxTrap).toBe(true);
    expect(trap.excessAbove100k).toBe(10000);
    expect(trap.marginalRatePct).toBe(62);
    expect(trap.recommendedSacrifice).toBe(10000);
    expect(trap.estimatedTaxSaved).toBe(6200);
  });

  it("calculates UK take home and attaches tax trap analysis", () => {
    const result = calculateUKTakeHome(65000, 5, true);
    expect(result.monthlyTakeHome).toBeGreaterThan(0);
    expect(result.trapAnalysis.isInTaxTrap).toBe(false);
  });
});
