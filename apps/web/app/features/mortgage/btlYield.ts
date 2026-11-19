import {
  getRecordAnnualTotalForTaxYear,
  grossRentalYieldPct,
  isRecordActiveInTaxYear,
  type TaxRecordFields,
} from "@flump/finance-engine";

/**
 * The rent recorded in Self Assessment for one property in a tax year: the `rental_income`
 * records linked to its account (slice 7, L22). Rent is entered once, in Self Assessment, and the
 * Mortgage page reads it from there; unlinked rent cannot be put against a property.
 */
export function rentForPropertyInYear(
  records: readonly (TaxRecordFields & { accountId?: string | null })[],
  propertyId: string,
  taxYear: string,
): number {
  return records
    .filter(
      (r) =>
        r.accountId === propertyId &&
        r.source === "rental" &&
        r.type === "income" &&
        r.category === "rental_income" &&
        isRecordActiveInTaxYear(r, taxYear),
    )
    .reduce((sum, r) => sum + getRecordAnnualTotalForTaxYear(r, taxYear), 0);
}

export interface BtlPropertyYield {
  id: string;
  name: string;
  /** Gross yield in per cent, or null with no linked rent or no value. */
  yieldPct: number | null;
}

/** Each rental property's gross yield for the tax year, from its linked rent and its value. */
export function btlPropertyYields(
  properties: readonly { id: string; name: string; balance?: number | string | null }[],
  records: readonly (TaxRecordFields & { accountId?: string | null })[],
  taxYear: string,
): BtlPropertyYield[] {
  return properties.map((p) => ({
    id: p.id,
    name: p.name,
    yieldPct: grossRentalYieldPct({
      rentForYear: rentForPropertyInYear(records, p.id, taxYear),
      propertyValue: Number(p.balance ?? 0) || 0,
    }),
  }));
}
