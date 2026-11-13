import {
  genericAccountLabel,
  getCurrentUkTaxYear,
  getLatestSupportedUkTaxYear,
  getTaxYearVerification,
  type TaxVerification,
  type UkTaxYear,
} from "@flump/finance-engine";

/**
 * E17-N5 (interim, D6-A): a default a tool substituted because the user's data or the caller's
 * arguments did not supply a value. Later tickets replace these with proper missing-data handling.
 * `value` echoes only constants the tool substituted, never numbers derived from user data.
 */
export interface Assumption {
  field: string;
  /** Absent for values derived from user data. */
  value?: number | string;
  reason: string;
}

export function assumption(field: string, value: number | string, reason: string): Assumption {
  return { field, value, reason };
}

/** An assumption whose value is computed from the user's data: the value is deliberately omitted. */
export function derivedAssumption(field: string, reason: string): Assumption {
  return { field, reason };
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

/** Per-type labels, numbered over all accounts as in the AI context pack; generic when anonymised. */
export function accountLabels<T extends { type?: string | null; name?: string | null }>(
  accounts: readonly T[],
  anonymise: boolean,
): Map<T, string> {
  const counters: Record<string, number> = {};
  const labels = new Map<T, string>();
  accounts.forEach((a, i) => {
    const key = genericAccountLabel(a.type, 0);
    counters[key] = (counters[key] ?? 0) + 1;
    labels.set(
      a,
      anonymise ? genericAccountLabel(a.type, counters[key]) : a.name || `Debt Account #${i + 1}`,
    );
  });
  return labels;
}

/** Current UK tax year, or the latest supported year (with an assumption) once the engine lags. */
export function defaultTaxYear(): { taxYear: UkTaxYear; assumptions: Assumption[] } {
  try {
    return { taxYear: getCurrentUkTaxYear(), assumptions: [] };
  } catch {
    const taxYear = getLatestSupportedUkTaxYear();
    return {
      taxYear,
      assumptions: [
        assumption(
          "taxYear",
          taxYear,
          "No tax year given and the current UK tax year is not supported yet, so the latest supported year was used.",
        ),
      ],
    };
  }
}
