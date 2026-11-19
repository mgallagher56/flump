import type { DebtSummary as EngineDebtSummary } from "@flump/finance-engine";

/**
 * The debt summary now lives in the engine's financial picture (`selectDebtSummary`, audit slice
 * 3). This re-export keeps the existing callers working until they read `picture.debtSummary`.
 * `totalInterest` and `promoRevertAssumed` are optional here only so existing fixtures stay valid;
 * the engine always sets them.
 */
export type DebtSummary = Omit<EngineDebtSummary, "totalInterest" | "promoRevertAssumed"> & {
  totalInterest?: number | null;
  promoRevertAssumed?: EngineDebtSummary["promoRevertAssumed"];
};

export { selectDebtSummary as buildDebtSummary } from "@flump/finance-engine";
