import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * Which line carries the Personal Allowance that savings and dividends take away.
 *
 * The allowance falls by £1 for every £2 of adjusted net income above £100,000 (ITA 2007 s.35(2);
 * adjusted net income, s.58), and savings interest and dividends count towards that income. The
 * lost allowance is then taxed on the salary, because the allowance is set against non-savings
 * income first (s.25(2)). Tax the employer takes under PAYE sees only the salary, so this extra
 * tax is part of the bill still to pay.
 *
 * Before: that tax was shown as "Income Tax on self-employed profit", even for someone with no
 * self-employment. After: it has its own line, `allowanceTaperTaxDue`, and the self-employed line
 * is the tax on the salary and the profit, minus the PAYE tax. The total bill does not move.
 *
 * Order: self-employed profit is non-savings income and comes first (s.16), so the allowance it
 * takes away stays on its own line; the allowance savings and dividends take away comes after.
 *
 * 2025/26 and 2026/27 share every figure used here: Personal Allowance 12,570, basic rate band
 * 37,700 at 20%, higher rate 40% up to 125,140, taper from 100,000. Tax on the first 37,700 of
 * taxable income is 7,540.
 */

const YEARS = ["2025/26", "2026/27"] as const;

function record(
  taxYear: string,
  source: TaxRecordFields["source"],
  category: string,
  type: "income" | "expense",
  amount: number,
): TaxRecordFields {
  return {
    id: `${source}-${category}-${amount}`,
    type,
    source,
    category,
    name: category,
    amount,
    frequency: "annual",
    date: `${taxYear.slice(0, 4)}-06-06`,
    endDate: null,
    notes: null,
  };
}

describe.each(YEARS)("allowance lost to savings and dividends, %s", (year) => {
  it("salary 120,000 and savings 2,000: no self-employed tax, 400 on the taper line", () => {
    // PAYE: allowance on the salary alone 12,570 - (120,000 - 100,000) / 2 = 2,570, taxable
    //   117,430: 7,540 + 79,730 x 40% = 31,892, total 39,432.
    // With the savings: income 122,000, allowance 12,570 - 11,000 = 1,570, non-savings taxable
    //   118,430: 7,540 + 80,730 x 40% = 32,292, total 39,832.
    // The savings take away 1,000 of allowance, taxed at 40% on the salary: 39,832 - 39,432 = 400.
    // Savings tax: taxable income 120,430 is above 37,700, so the savings allowance is 500;
    //   1,500 x 40% = 600 (unchanged).
    // Bill: 39,832 + 600 = 40,432 in total, 40,432 - 39,432 = 1,000 still to pay (unchanged).
    const r = calculateUKTax(
      year,
      [record(year, "savings", "savings_interest", "income", 2000)],
      120000,
      100,
    );
    expect(r.payeTaxDue).toBe(39432);
    expect(r.seTaxDue).toBe(0);
    expect(r.allowanceTaperTaxDue).toBe(400);
    expect(r.savingsTaxDue).toBe(600);
    expect(r.totalIncomeTaxDue).toBe(40432);
    expect(r.netAdditionalTaxToPay).toBe(1000);
  });

  it("the PR 807 case with rent: salary 120,000, savings 2,000, rent profit 10,000", () => {
    // Rent 11,000 less 1,000 of costs. The rent and savings lines are worked in
    // tax-calculator.rental-attribution.test.ts: rent 5,171, savings 600, total 45,603.
    // Without the rent the savings take away 1,000 of allowance, as in the case above: 400.
    // It was on the self-employed line (400); it moves to the taper line. The rent line is the
    // tax with the rent minus the tax without it, so it does not move.
    // Parts: PAYE 39,432 + taper 400 + rent 5,171 + savings 600 = 45,603.
    const r = calculateUKTax(
      year,
      [
        record(year, "rental", "rental_income", "income", 11000),
        record(year, "rental", "repairs_maintenance", "expense", 1000),
        record(year, "savings", "savings_interest", "income", 2000),
      ],
      120000,
      100,
    );
    expect(r.seTaxDue).toBe(0);
    expect(r.allowanceTaperTaxDue).toBe(400);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(5171);
    expect(r.savingsTaxDue).toBe(600);
    expect(r.totalIncomeTaxDue).toBe(45603);
  });

  it("dividends take the allowance: salary 110,000, dividends 10,000", () => {
    // PAYE: allowance 12,570 - 5,000 = 7,570, taxable 102,430: 7,540 + 64,730 x 40% = 25,892,
    //   total 33,432.
    // With the dividends: income 120,000, allowance 12,570 - 10,000 = 2,570, non-savings taxable
    //   107,430: 7,540 + 69,730 x 40% = 27,892, total 35,432.
    // The dividends take away 5,000 of allowance: 35,432 - 33,432 = 2,000 on the taper line.
    // Dividend tax: 500 at the 0% allowance, 9,500 at the higher dividend rate (33.75% in 2025/26,
    //   35.75% in 2026/27; GOV.UK "Tax on dividends"): 3,206.25 or 3,396.25. Not changed here.
    const r = calculateUKTax(
      year,
      [record(year, "savings", "dividend_income", "income", 10000)],
      110000,
      100,
    );
    expect(r.payeTaxDue).toBe(33432);
    expect(r.seTaxDue).toBe(0);
    expect(r.allowanceTaperTaxDue).toBe(2000);
    expect(r.totalIncomeTaxDue - r.dividendTaxDue).toBe(35432);
    expect(r.dividendTaxDue).toBeCloseTo(year === "2025/26" ? 3206.25 : 3396.25, 2);
  });

  it("self-employed profit keeps its own taper: salary 90,000, profit 20,000, savings 5,000", () => {
    // Self-employed income 21,000, costs 1,000: profit 20,000 (the 1,000 trading allowance gives
    //   the same profit).
    // PAYE: allowance 12,570, taxable 77,430: 7,540 + 39,730 x 40% = 15,892, total 23,432.
    // Salary and profit: income 110,000, allowance 12,570 - 5,000 = 7,570, taxable 102,430:
    //   7,540 + 64,730 x 40% = 25,892, total 33,432. Self-employed line 33,432 - 23,432 = 10,000:
    //   20,000 x 40% plus 5,000 of lost allowance x 40%.
    // With the savings: income 115,000, allowance 12,570 - 7,500 = 5,070, non-savings taxable
    //   104,930: 7,540 + 67,230 x 40% = 26,892, total 34,432. Taper line 34,432 - 33,432 = 1,000.
    // Before, the self-employed line was 34,432 - 23,432 = 11,000.
    // Savings: allowance 500 (higher rate), 4,500 x 40% = 1,800.
    // Class 4 on 20,000 is unchanged and not asserted here.
    const r = calculateUKTax(
      year,
      [
        record(year, "self-employed", "self_employed_income", "income", 21000),
        record(year, "self-employed", "office_costs", "expense", 1000),
        record(year, "savings", "savings_interest", "income", 5000),
      ],
      90000,
      100,
    );
    expect(r.payeTaxDue).toBe(23432);
    expect(r.seTaxDue).toBe(10000);
    expect(r.allowanceTaperTaxDue).toBe(1000);
    expect(r.savingsTaxDue).toBe(1800);
    expect(r.totalIncomeTaxDue).toBe(34432 + 1800);
  });

  it("below the taper the line is 0: salary 50,000, savings 2,000", () => {
    const r = calculateUKTax(
      year,
      [record(year, "savings", "savings_interest", "income", 2000)],
      50000,
      100,
    );
    expect(r.allowanceTaperTaxDue).toBe(0);
    expect(r.seTaxDue).toBe(0);
  });
});
