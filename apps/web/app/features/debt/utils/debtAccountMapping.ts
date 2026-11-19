import type { DebtItem } from "@flump/finance-engine";

export type DebtAccountType = "Credit Card" | "Loan" | "Overdraft";

export interface DebtAccountPayload {
  name: string;
  type: DebtAccountType;
  /** Liabilities are stored as minus the amount owed. */
  balance: number;
  /** Null when the APR is unknown. 0 is a real rate. */
  interestRate: number | null;
  /** The minimum monthly payment, or null when unknown or estimated. */
  monthlyContribution: number | null;
  /** Credit card / overdraft limit (usable even at £0 balance), or null when unset. */
  creditLimit: number | null;
  /** 0% promotional interest end date (YYYY-MM-DD), or null when unset. */
  promoZeroPercentUntil: string | null;
}

export function debtTypeToAccountType(type: DebtItem["type"]): DebtAccountType {
  if (type === "credit_card") return "Credit Card";
  if (type === "overdraft") return "Overdraft";
  return "Loan";
}

export function debtItemToAccountPayload(d: Omit<DebtItem, "id">): DebtAccountPayload {
  const balance = Math.abs(Number(d.balance ?? d.balanceGbp ?? 0));
  const apr = d.apr ?? d.interestRateApr;
  const minimum = d.minimumPayment ?? d.minimumPaymentGbp ?? 0;
  const aprUnknown = d.aprKnown === false || apr === undefined || !Number.isFinite(apr);
  const minimumUnknown = d.minimumPaymentEstimated === true || !(minimum > 0);
  const creditLimit =
    d.creditLimitGbp !== undefined &&
    d.creditLimitGbp !== null &&
    Number.isFinite(Number(d.creditLimitGbp)) &&
    Number(d.creditLimitGbp) >= 0
      ? Number(d.creditLimitGbp)
      : null;
  const promoZeroPercentUntil =
    typeof d.promoAprExpiryDate === "string" && d.promoAprExpiryDate !== ""
      ? d.promoAprExpiryDate
      : null;

  return {
    name: d.name,
    type: debtTypeToAccountType(d.type ?? d.debtType),
    balance: balance === 0 ? 0 : -balance,
    interestRate: aprUnknown ? null : (apr as number),
    monthlyContribution: minimumUnknown ? null : minimum,
    creditLimit,
    promoZeroPercentUntil,
  };
}

/** The loan kind a debt type is saved with (system audit slice 4); a card or overdraft has none. */
export function debtTypeToAccountSubtype(
  type: DebtItem["type"],
): "car_finance" | "buy_now_pay_later" | "other_loan" | null {
  if (type === "credit_card" || type === "overdraft") return null;
  if (type === "car_finance") return "car_finance";
  if (type === "bnpl") return "buy_now_pay_later";
  return "other_loan";
}
