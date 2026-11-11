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

  return {
    name: d.name,
    type: debtTypeToAccountType(d.type ?? d.debtType),
    balance: balance === 0 ? 0 : -balance,
    interestRate: aprUnknown ? null : (apr as number),
    monthlyContribution: minimumUnknown ? null : minimum,
  };
}
