import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  calculateCompoundTrajectory,
  calculateTaxTrapRelief,
  calculateUKTakeHome,
  clearOnboardingSeed,
  ONBOARDING_SEED_STORAGE_KEY,
  type OnboardingSeedPayload,
  persistOnboardingSeed,
  readAndClearOnboardingSeed,
  readOnboardingSeed,
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

  describe("onboarding seed storage", () => {
    const mockStorage: Record<string, string> = {};

    beforeEach(() => {
      for (const key of Object.keys(mockStorage)) {
        delete mockStorage[key];
      }
      (globalThis as any).window = {
        localStorage: {
          getItem: (key: string) => mockStorage[key] ?? null,
          setItem: (key: string, val: string) => {
            mockStorage[key] = val;
          },
          removeItem: (key: string) => {
            delete mockStorage[key];
          },
        },
      };
    });

    afterEach(() => {
      delete (globalThis as any).window;
    });

    const samplePayload: OnboardingSeedPayload = {
      grossSalary: 85000,
      pensionContributionPct: 6,
      salarySacrifice: true,
      initialCashSavings: 15000,
      initialInvestments: 20000,
      monthlyContribution: 500,
      inferredModules: ["accounts", "budget", "savings", "tax"],
      timestamp: 1700000000000,
    };

    it("persists encoded payload and does not store raw salary string", () => {
      persistOnboardingSeed(samplePayload);
      const rawStored = mockStorage[ONBOARDING_SEED_STORAGE_KEY];
      expect(rawStored).toBeDefined();
      expect(rawStored).not.toContain("85000");
      expect(rawStored).not.toContain("grossSalary");

      const retrieved = readOnboardingSeed();
      expect(retrieved).toEqual(samplePayload);
    });

    it("clears persisted seed", () => {
      persistOnboardingSeed(samplePayload);
      expect(readOnboardingSeed()).toEqual(samplePayload);
      clearOnboardingSeed();
      expect(readOnboardingSeed()).toBeNull();
    });

    it("reads and clears persisted seed in one atomic call", () => {
      persistOnboardingSeed(samplePayload);
      const retrieved = readAndClearOnboardingSeed();
      expect(retrieved).toEqual(samplePayload);
      expect(readOnboardingSeed()).toBeNull();
    });
  });
});
