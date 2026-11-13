import { getTaxYearVerification, type TaxVerification } from "@flump/finance-engine";

/**
 * E17-N5 (interim, D6-A): a default a tool substituted because the user's data or the caller's
 * arguments did not supply a value. Later tickets replace these with proper missing-data handling.
 */
export interface Assumption {
  field: string;
  value: number | string;
  reason: string;
}

export function assumption(field: string, value: number | string, reason: string): Assumption {
  return { field, value, reason };
}

/** Shown in every tax tool response (D4-B). */
export const TAX_NOTICE =
  "Estimate from published UK tax rules. This is a calculation, not tax advice. Check figures against HMRC or a qualified adviser before acting.";

export function taxVerificationFields(taxYear: string): {
  verification: TaxVerification;
  notice: string;
} {
  return { verification: getTaxYearVerification(taxYear), notice: TAX_NOTICE };
}
