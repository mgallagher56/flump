import type { AvalancheVsSnowballComparison, PayoffResult } from "@flump/finance-engine";

/** A payoff result without its month-by-month schedule (E17-N3: summaries only). */
export type PayoffSummary = Omit<PayoffResult, "monthlySchedule">;

export type ComparisonSummary = Omit<
  AvalancheVsSnowballComparison,
  "avalanche" | "snowball" | "minimumOnly"
> & {
  avalanche: PayoffSummary;
  snowball: PayoffSummary;
  minimumOnly: PayoffSummary;
};

export function summarisePayoff(result: PayoffResult): PayoffSummary {
  const { monthlySchedule: _monthlySchedule, ...summary } = result;
  return summary;
}

/** Drops `monthlySchedule` from all three strategies in a comparison. */
export function summariseComparison(comparison: AvalancheVsSnowballComparison): ComparisonSummary {
  return {
    ...comparison,
    avalanche: summarisePayoff(comparison.avalanche),
    snowball: summarisePayoff(comparison.snowball),
    minimumOnly: summarisePayoff(comparison.minimumOnly),
  };
}
