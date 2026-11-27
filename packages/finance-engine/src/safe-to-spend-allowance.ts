import type { SafeToSpendResult } from "./types.js";

/**
 * Calculates Weekly Safe-to-Spend Allowance Metric.
 */
export function calculateSafeToSpend(
  monthlyIncome: number,
  fixedBills: number,
  minDebtPayments: number,
  essentialGroceries: number,
): SafeToSpendResult {
  const fixedCommitments = fixedBills + minDebtPayments + essentialGroceries;
  const monthlyDiscretionary = Math.max(0, monthlyIncome - fixedCommitments);
  // 52 weeks / 12 months = 4.3333 weeks per month
  const weeklyAllowance = Math.round((monthlyDiscretionary / 4.333333) * 100) / 100;
  const dailyAllowance = Math.round((weeklyAllowance / 7) * 100) / 100;

  return {
    weeklyAllowance,
    dailyAllowance,
    monthlyDiscretionary: Math.round(monthlyDiscretionary * 100) / 100,
    fixedCommitments: Math.round(fixedCommitments * 100) / 100,
  };
}
