import { describe, expect, it } from "vitest";
import { calculateUKTax, incomeOutsidePaye, type TaxRecordFields } from "./tax-calculator.js";

/**
 * Investment management fees do not reduce the tax on savings interest or dividends for an
 * individual: interest is charged on "the full amount of the interest arising" (ITTOIA 2005
 * s.370) and dividends on the amount paid (s.384), with no deduction for expenses. The fees can
 * still be recorded; the estimate leaves them out of the tax.
 *
 * England bands; Personal Allowance 12,570, basic rate band 37,700, the same in both years.
 */

const savings = (taxYear: string, category: string, type: "income" | "expense", amount: number) =>
  ({
    id: `${category}-${amount}`,
    type,
    source: "savings",
    category,
    name: category,
    amount,
    frequency: "annual",
    date: `${taxYear.slice(0, 4)}-06-06`,
    endDate: null,
    notes: null,
  }) satisfies TaxRecordFields;

describe.each(["2025/26", "2026/27"])("investment fees and savings tax, %s", (year) => {
  it("salary 60,000, interest 3,000, fees 500: the fees are not taken off the interest", () => {
    // Non-savings taxable 60,000 - 12,570 = 47,430, above the 37,700 basic rate band, so the
    // Personal Savings Allowance is 500 (ITA 2007 s.12B). Interest 3,000 less the 500 allowance
    // = 2,500 at 40% = 1,000. Before: the fees came off first, 2,000 at 40% = 800.
    const r = calculateUKTax(
      year,
      [
        savings(year, "savings_interest", "income", 3000),
        savings(year, "investment_fees", "expense", 500),
      ],
      60000,
      100,
    );
    expect(r.savingsTaxDue).toBe(1000);
    expect(r.taxableSavingsInterest).toBe(2500);
    // Still recorded and reported, but not a cost the estimate deducts.
    expect(r.savingsExpenses).toBe(500);
    expect(incomeOutsidePaye(r)).toEqual({ income: 3000, costs: 0 });
  });
});
