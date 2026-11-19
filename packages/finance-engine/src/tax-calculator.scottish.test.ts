import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * Scottish taxpayers in the Self Assessment estimate (owner decision 7, audit slice 7).
 *
 * Sources:
 * - Scottish rates apply to non-savings income only: ITA 2007 s.11A(1A). Savings interest and
 *   dividends are taxed at UK rates on the UK bands, which non-savings income uses first (s.16,
 *   s.10; HMRC PAYE12060).
 * - The Personal Savings Allowance band is decided as if the person were not a Scottish taxpayer:
 *   s.12B(8). The starting rate for savings (5,000) has no Scottish rule: s.12.
 * - The finance cost reducer is at the basic rate, 20% (ITTOIA 2005 s.274AA(5); ITA s.6(2)), a
 *   Step 6 reduction allowed only so far as there is tax (ITA s.26(1)(a), s.29(2)). So with a 19%
 *   starter rate the 20% reducer can exceed the tax on the rent, and the rest comes off the tax on
 *   savings.
 * - Scottish bands, as taxable income above the Personal Allowance (GOV.UK "Income Tax rates and
 *   allowances: current and past"):
 *   2025/26: starter 19% to 2,827; basic 20% to 14,921; intermediate 21% to 31,092; higher 42% to
 *   62,430; advanced 45% to 125,140; top 48%.
 *   2026/27: starter to 3,967; basic to 16,956; the rest as 2025/26.
 * - Personal Allowance 12,570 both years; UK basic rate band 37,700.
 */

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

const rent = (year: string, income: number, costs: number, interest: number) => [
  record(year, "rental", "rental_income", "income", income),
  record(year, "rental", "repairs_maintenance", "expense", costs),
  record(year, "rental", "mortgage_interest", "expense", interest),
];

describe("Scottish bands on non-savings income", () => {
  it("salary 40,000, rent profit 10,000, interest 3,000 (2026/27)", () => {
    // Without the rent: taxable 27,430. Starter 3,967 x 19% = 753.73; basic 12,989 x 20% =
    //   2,597.80; intermediate 10,474 x 21% = 2,199.54. Total 5,551.07 (the PAYE tax).
    // With the rent: taxable 37,430. Starter 753.73; basic 2,597.80; intermediate 14,136 x 21% =
    //   2,968.56; higher 6,338 x 42% = 2,661.96. Total 8,982.05.
    // Tax on the rent before the credit: 8,982.05 - 5,551.07 = 3,430.98.
    // Credit: 20% x the lowest of interest 3,000, profit 10,000 and income above the allowance
    //   37,430 = 600. Bill: 3,430.98 - 600 = 2,830.98. Total Income Tax 8,382.05.
    // England bands gave: 10,000 x 20% = 2,000, less 600 = 1,400.
    const r = calculateUKTax("2026/27", rent("2026/27", 11000, 1000, 3000), 40000, 100, {
      region: "SCOTLAND",
    });
    expect(r.payeTaxDue).toBeCloseTo(5551.07, 2);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(3430.98, 2);
    expect(r.rentalPropertyTaxCredit).toBe(600);
    expect(r.totalIncomeTaxDue).toBeCloseTo(8382.05, 2);
    expect(r.netAdditionalTaxToPay).toBeCloseTo(2830.98, 2);
  });

  it("salary 40,000, rent profit 10,000, interest 3,000 (2025/26)", () => {
    // Without the rent: starter 2,827 x 19% = 537.13; basic 12,094 x 20% = 2,418.80;
    //   intermediate 12,509 x 21% = 2,626.89. Total 5,582.82.
    // With the rent: intermediate 16,171 x 21% = 3,395.91; higher 6,338 x 42% = 2,661.96.
    //   Total 537.13 + 2,418.80 + 3,395.91 + 2,661.96 = 9,013.80.
    // Rent before credit 3,430.98 (3,662 x 21% + 6,338 x 42%); credit 600; bill 2,830.98.
    const r = calculateUKTax("2025/26", rent("2025/26", 11000, 1000, 3000), 40000, 100, {
      region: "SCOTLAND",
    });
    expect(r.payeTaxDue).toBeCloseTo(5582.82, 2);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(3430.98, 2);
    expect(r.totalIncomeTaxDue).toBeCloseTo(8413.8, 2);
    expect(r.netAdditionalTaxToPay).toBeCloseTo(2830.98, 2);
  });

  it("taxes savings at UK rates and picks the savings allowance on UK bands", () => {
    // Salary 40,000, savings interest 2,000, 2026/27. The person pays the Scottish intermediate
    // rate on the salary, but total taxable income 29,430 is inside the UK basic rate band, so
    // the savings allowance is 1,000 (s.12B(8)): 1,000 at 0%, 1,000 at 20% = 200.
    // PAYE 5,551.07 as above. Bill 200.
    const r = calculateUKTax(
      "2026/27",
      [record("2026/27", "savings", "savings_interest", "income", 2000)],
      40000,
      100,
      { region: "SCOTLAND" },
    );
    expect(r.personalSavingsAllowance).toBe(1000);
    expect(r.savingsTaxDue).toBe(200);
    expect(r.payeTaxDue).toBeCloseTo(5551.07, 2);
    expect(r.netAdditionalTaxToPay).toBeCloseTo(200, 2);
  });

  it("lets the 20% credit go beyond the 19% tax on the rent, down to the tax on savings", () => {
    // No salary; rent 16,570 less 1,000 of costs (profit 15,570); interest 3,000; savings 6,000.
    // 2026/27. Income 21,570, allowance 12,570, all set against the rent first.
    // Non-savings taxable 3,000, inside the 3,967 starter band: 3,000 x 19% = 570.
    // Savings: starting rate 5,000 - 3,000 = 2,000 at 0%; total taxable 9,000 is basic rate, so
    //   the allowance is 1,000 at 0%; 3,000 x 20% = 600.
    // Credit: 20% x the lowest of 3,000, 15,570 and 3,000 = 600. Tax before the credit 1,170;
    //   after 570. The old rule took the credit from the rent's 570 only and lost 30.
    // The property allowance route (profit 15,570, no credit) costs 1,170, so costs are used.
    const r = calculateUKTax(
      "2026/27",
      [
        ...rent("2026/27", 16570, 1000, 3000),
        record("2026/27", "savings", "savings_interest", "income", 6000),
      ],
      0,
      100,
      { region: "SCOTLAND" },
    );
    expect(r.rentalPropertyTaxCredit).toBe(600);
    expect(r.totalIncomeTaxDue).toBeCloseTo(570, 2);
  });

  it("the same case in 2025/26", () => {
    // Non-savings taxable 3,000: starter 2,827 x 19% = 537.13, basic 173 x 20% = 34.60, total
    // 571.73. Savings 600 as above. Credit 600. Total 571.73.
    const r = calculateUKTax(
      "2025/26",
      [
        ...rent("2025/26", 16570, 1000, 3000),
        record("2025/26", "savings", "savings_interest", "income", 6000),
      ],
      0,
      100,
      { region: "SCOTLAND" },
    );
    expect(r.totalIncomeTaxDue).toBeCloseTo(571.73, 2);
  });

  it("leaves England, Wales and Northern Ireland as before when no region is given", () => {
    // Salary 40,000, rent profit 10,000 at 20% = 2,000, credit 600: bill 1,400.
    const r = calculateUKTax("2026/27", rent("2026/27", 11000, 1000, 3000), 40000, 100);
    expect(r.netAdditionalTaxToPay).toBe(1400);
    const ewni = calculateUKTax("2026/27", rent("2026/27", 11000, 1000, 3000), 40000, 100, {
      region: "ENGLAND_NI_WALES",
    });
    expect(ewni.netAdditionalTaxToPay).toBe(1400);
  });
});
