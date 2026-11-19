import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * How much of the bill the rent causes (Section 24 audit, owner-approved fix of three cases).
 *
 * "Tax on rental profit" is the tax with the rent minus the tax without it. The rent's profit
 * counts towards adjusted net income, and the Personal Allowance falls by £1 for every £2 of it
 * above £100,000 (ITA 2007 s.35(2); adjusted net income, s.58). So the allowance the rent takes
 * away is tax the rent causes, and it is shown against the rent, not against the salary or a
 * self-employment the person may not have. The total bill does not change.
 *
 * 2025/26 and 2026/27 share every figure used here: Personal Allowance 12,570, basic rate band
 * 37,700 at 20%, higher rate 40%, taper from 100,000.
 */

const YEARS = ["2025/26", "2026/27"] as const;

function rental(taxYear: string, category: string, amount: number): TaxRecordFields {
  const startYear = taxYear.slice(0, 4);
  return {
    id: `${category}-${amount}`,
    type: category === "rental_income" ? "income" : "expense",
    source: "rental",
    category,
    name: category,
    amount,
    frequency: "annual",
    date: `${startYear}-06-06`,
    endDate: null,
    notes: null,
  };
}

describe.each(YEARS)("rent-attributed tax in %s", (year) => {
  it("puts the Personal Allowance the rent takes away against the rent (salary 95,000)", () => {
    // Salary 95,000; rent 20,000; mortgage interest 8,000; other costs 2,000. Sole owner.
    // Rental profit before interest: 20,000 - 2,000 = 18,000.
    // With the rent: adjusted net income 113,000, allowance 12,570 - (13,000 / 2) = 6,070,
    //   taxable 106,930: 37,700 x 20% = 7,540 plus 69,230 x 40% = 27,692, total 35,232.
    // Without the rent: allowance 12,570, taxable 82,430: 7,540 plus 44,730 x 40% = 17,892,
    //   total 25,432 (the PAYE figure).
    // Tax on the rent before the credit: 35,232 - 25,432 = 9,800.
    // Credit: 20% of the lowest of interest 8,000, profit 18,000 and adjusted total income
    //   106,930 = 1,600 (ITTOIA 2005 s.274AA). After the credit: 8,200.
    // The property allowance route (19,000 profit, no credit) costs more, so costs are used.
    const r = calculateUKTax(
      year,
      [
        rental(year, "rental_income", 20000),
        rental(year, "mortgage_interest", 8000),
        rental(year, "repairs_maintenance", 2000),
      ],
      95000,
      100,
    );
    expect(r.personalAllowance).toBe(6070);
    expect(r.payeTaxDue).toBe(25432);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(9800);
    expect(r.rentalPropertyTaxCredit).toBe(1600);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(8200);
    // No self-employment, so no Income Tax on self-employed profit.
    expect(r.seTaxDue).toBe(0);
    // The bill itself is unchanged: 35,232 - 1,600 = 33,632, of which 8,200 is still to pay.
    expect(r.totalIncomeTaxDue).toBe(33632);
    expect(r.netAdditionalTaxToPay).toBe(8200);
  });

  it("leaves the split alone below the taper (salary 30,000)", () => {
    // Salary 30,000; rent 15,000; interest 6,000; other costs 2,000. Profit 13,000, all at 20%:
    // 2,600 before the credit; credit 20% x 6,000 = 1,200; after 1,400.
    const r = calculateUKTax(
      year,
      [
        rental(year, "rental_income", 15000),
        rental(year, "mortgage_interest", 6000),
        rental(year, "repairs_maintenance", 2000),
      ],
      30000,
      100,
    );
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(2600);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(1400);
    expect(r.seTaxDue).toBe(0);
  });
});
