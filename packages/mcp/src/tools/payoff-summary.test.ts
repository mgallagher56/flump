import type { AvalancheVsSnowballComparison, PayoffResult } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { summariseComparison, summarisePayoff } from "./payoff-summary.js";

const payoff = (months: number): PayoffResult =>
  ({
    strategy: "AVALANCHE",
    monthsToPayoff: months,
    totalInterestPaid: 12.5,
    monthlySchedule: [{ month: 1 }],
  }) as unknown as PayoffResult;

describe("payoff summaries", () => {
  it("drops the month-by-month schedule and keeps every other field", () => {
    expect(summarisePayoff(payoff(4))).toEqual({
      strategy: "AVALANCHE",
      monthsToPayoff: 4,
      totalInterestPaid: 12.5,
    });
  });

  it("drops the schedule from all three strategies of a comparison", () => {
    const comparison = {
      avalanche: payoff(4),
      snowball: payoff(5),
      minimumOnly: payoff(9),
      interestSavedGbp: 3,
    } as unknown as AvalancheVsSnowballComparison;
    const s = summariseComparison(comparison) as unknown as Record<string, Record<string, unknown>>;
    expect(s.interestSavedGbp).toBe(3);
    for (const [name, months] of [
      ["avalanche", 4],
      ["snowball", 5],
      ["minimumOnly", 9],
    ] as const) {
      expect(s[name]?.monthsToPayoff, name).toBe(months);
      expect(s[name], name).not.toHaveProperty("monthlySchedule");
    }
  });
});
