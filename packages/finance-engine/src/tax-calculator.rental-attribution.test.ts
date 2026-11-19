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

function savings(taxYear: string, category: string, amount: number): TaxRecordFields {
  return { ...rental(taxYear, category, amount), source: "savings", type: "income" };
}

/**
 * The rent is non-savings income, and savings and then dividends are stacked above non-savings
 * income (ITA 2007 s.16). So the rent can push savings and dividends into a higher band, shrink
 * the 5,000 starting rate for savings (ITA 2007 s.12), drop the Personal Savings Allowance from
 * 1,000 to 500 to 0 (ITA 2007 s.12B: it turns on whether any income, nil-rated included, falls
 * in the higher or additional rate) and move the 500 dividend allowance into a higher band
 * (ITA 2007 s.13A: the allowance's amount does not change, the band it sits in does). Each case
 * below crosses one of those edges. All of that extra tax counts against the rent, and the
 * savings and dividend lines show what they would be without the rent. Totals do not move.
 *
 * Rates (GOV.UK "Income Tax rates and allowances: current and past", updated 6 April 2026):
 * as above, starting rate for savings 5,000 at 0%, dividend allowance 500; dividend rates
 * 8.75/33.75/39.35% in 2025/26 and 10.75/35.75/39.35% in 2026/27. PSA 1,000/500/0 (s.12B).
 */
describe("rent with savings or dividends", () => {
  it.each([
    // [year, dividend line without rent, dividend line before this change]
    ["2025/26", 4138.75, 6581.25],
    ["2026/27", 4528.75, 6971.25],
  ] as const)("dividends pushed into the higher band, %s", (year, divWithout, divWith) => {
    // Salary 40,000; dividends 20,000; rent 11,000 less 1,000 of costs, profit 10,000 (no interest;
    // the property allowance gives the same profit, and costs are kept on a tie).
    // Without rent: non-savings taxable 27,430, tax 5,486. Basic band left 10,270: the 500
    //   dividend allowance takes 500 of it, 9,770 at the ordinary rate, 9,730 at the upper rate.
    //   2025/26: 9,770 x 8.75% + 9,730 x 33.75% = 854.875 + 3,283.875 = 4,138.75.
    //   2026/27: 9,770 x 10.75% + 9,730 x 35.75% = 1,050.275 + 3,478.475 = 4,528.75.
    // With rent: non-savings taxable 37,430, tax 7,486. Basic band left 270, so the allowance
    //   sits in 270 basic + 230 higher and 19,500 is at the upper rate:
    //   2025/26: 6,581.25; 2026/27: 6,971.25.
    // Rent: 2,000 non-savings + (divWith - divWithout) = 2,000 + 2,442.50 = 4,442.50 both years
    //   (9,770 moves up 25 points either year).
    const r = calculateUKTax(
      year,
      [
        rental(year, "rental_income", 11000),
        rental(year, "repairs_maintenance", 1000),
        savings(year, "dividend_income", 20000),
      ],
      40000,
      100,
    );
    expect(r.rentalPropertyTaxDueBeforeCredit).toBeCloseTo(4442.5, 2);
    expect(r.rentalPropertyTaxDueAfterCredit).toBeCloseTo(4442.5, 2);
    expect(r.dividendTaxDue).toBeCloseTo(divWithout, 2);
    expect(r.savingsTaxDue).toBe(0);
    // The bill: 7,486 + divWith, unchanged.
    expect(r.totalIncomeTaxDue).toBeCloseTo(7486 + divWith, 2);
  });

  it.each(YEARS)("Personal Savings Allowance falls from 1,000 to 500, %s", (year) => {
    // Salary 45,000; savings interest 2,000; rent 11,000 less 1,000 of costs (profit 10,000).
    // Without rent: non-savings taxable 32,430, tax 6,486. Total taxable 34,430 is inside the
    //   basic rate band, so PSA 1,000: 1,000 at 0%, 1,000 at 20% = 200.
    // With rent: non-savings taxable 42,430, tax 7,540 + 4,730 x 40% = 9,432. Total taxable
    //   44,430 reaches the higher rate, so PSA 500: 1,500 at 40% = 600.
    // Rent: (9,432 - 6,486) + (600 - 200) = 2,946 + 400 = 3,346. Savings line 200 (was 600).
    const r = calculateUKTax(
      year,
      [
        rental(year, "rental_income", 11000),
        rental(year, "repairs_maintenance", 1000),
        savings(year, "savings_interest", 2000),
      ],
      45000,
      100,
    );
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(3346);
    expect(r.savingsTaxDue).toBe(200);
    expect(r.totalIncomeTaxDue).toBe(10032);
  });

  it.each(YEARS)("Personal Savings Allowance falls from 500 to 0 (additional rate), %s", (year) => {
    // Salary 120,000; savings 2,000; rent 11,000 less 1,000 of costs (profit 10,000).
    // Without rent: income 122,000, allowance 12,570 - 11,000 = 1,570, non-savings taxable
    //   118,430: 7,540 + 80,730 x 40% = 39,832. Total taxable 120,430 is below 125,140, PSA 500:
    //   1,500 at 40% = 600.
    // With rent: income 132,000, no allowance. Non-savings taxable 130,000: 7,540 + 87,440 x 40%
    //   + 4,860 x 45% = 7,540 + 34,976 + 2,187 = 44,703. PSA 0: 2,000 at 45% = 900.
    // Rent: (44,703 - 39,832) + (900 - 600) = 4,871 + 300 = 5,171. Savings line 600 (was 900).
    const r = calculateUKTax(
      year,
      [
        rental(year, "rental_income", 11000),
        rental(year, "repairs_maintenance", 1000),
        savings(year, "savings_interest", 2000),
      ],
      120000,
      100,
    );
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(5171);
    expect(r.savingsTaxDue).toBe(600);
    expect(r.totalIncomeTaxDue).toBe(45603);
  });

  it.each(YEARS)("starting rate for savings shrinks, %s", (year) => {
    // Salary 13,000; savings 6,000; rent 5,500 with 1,500 of costs (profit 4,000; the 1,000
    // property allowance would leave 4,500, so costs are used).
    // Without rent: non-savings taxable 430, tax 86. Starting rate 5,000 - 430 = 4,570 at 0%,
    //   PSA 1,000 at 0%, 430 at 20% = 86.
    // With rent: non-savings taxable 4,430, tax 886. Starting rate 570, PSA 1,000, 4,430 at
    //   20% = 886.
    // Rent: (886 - 86) + (886 - 86) = 1,600. Savings line 86 (was 886).
    const r = calculateUKTax(
      year,
      [
        rental(year, "rental_income", 5500),
        rental(year, "repairs_maintenance", 1500),
        savings(year, "savings_interest", 6000),
      ],
      13000,
      100,
    );
    expect(r.propertyAllowanceUsed).toBe(0);
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(1600);
    expect(r.savingsTaxDue).toBe(86);
    expect(r.totalIncomeTaxDue).toBe(1772);
  });

  it.each(YEARS)("savings with the taper: only the allowance moves, %s", (year) => {
    // Salary 90,000; savings 5,000; rent 11,000 less 1,000 of costs (profit 10,000). PSA is 500 with or without the rent.
    // Without rent: income 95,000, allowance 12,570, non-savings taxable 77,430: 23,432;
    //   savings 4,500 x 40% = 1,800.
    // With rent: income 105,000, allowance 10,070, non-savings taxable 89,930: 28,432;
    //   savings 1,800. Rent 5,000; savings line 1,800 either way.
    const r = calculateUKTax(
      year,
      [
        rental(year, "rental_income", 11000),
        rental(year, "repairs_maintenance", 1000),
        savings(year, "savings_interest", 5000),
      ],
      90000,
      100,
    );
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(5000);
    expect(r.savingsTaxDue).toBe(1800);
  });
});

/**
 * Finance costs carried forward (ITTOIA 2005 s.274AA(4)): the relievable amount less the amount
 * actually relieved carries forward to the next year. A carried-in amount joins this year's
 * finance costs in the relievable amount (s.274A(2)-(3)), under the same three limits.
 */
describe.each(YEARS)("finance costs carried forward, %s", (year) => {
  const ledger = (salary: number, rent: number, interest: number, costs: number, bf = 0) =>
    calculateUKTax(
      year,
      [
        rental(year, "rental_income", rent),
        rental(year, "mortgage_interest", interest),
        rental(year, "repairs_maintenance", costs),
      ],
      salary,
      100,
      { financeCostsBroughtForward: bf },
    );

  it("nothing carried: all interest used", () => {
    // Salary 30,000; rent 15,000; interest 6,000; costs 2,000. Limits: 6,000, 13,000, 30,430.
    // 6,000 used, 0 carries forward.
    const r = ledger(30000, 15000, 6000, 2000);
    expect(r.financeCostsCarriedForward).toBe(0);
  });

  it("nothing carried in, some carries out (limited by income above the allowance)", () => {
    // No salary; rent 18,000; interest 5,000; costs 2,000. Adjusted total income 3,430 is the
    // lowest limit: 3,430 used, 5,000 - 3,430 = 1,570 carries forward.
    const r = ledger(0, 18000, 5000, 2000);
    expect(r.rentalPropertyTaxCredit).toBe(686);
    expect(r.financeCostsCarriedForward).toBe(1570);
  });

  it("carried in and fully used", () => {
    // Salary 30,000; rent 15,000; interest 6,000; costs 2,000; 2,000 brought forward.
    // Relievable 8,000; profit 13,000; ATI 30,430. Credit 20% x 8,000 = 1,600.
    // Tax on rent 2,600 - 1,600 = 1,000. Nothing carries forward.
    const r = ledger(30000, 15000, 6000, 2000, 2000);
    expect(r.rentalPropertyTaxCredit).toBe(1600);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(1000);
    expect(r.financeCostsCarriedForward).toBe(0);
  });

  it("carried in and partly used (limited by profit)", () => {
    // Salary 50,000; rent 10,000; interest 6,000; costs 2,000; 4,000 brought forward.
    // Relievable 10,000; profit 8,000 is the lowest limit. Credit 1,600; tax on rent
    // 3,146 - 1,600 = 1,546; 10,000 - 8,000 = 2,000 carries forward.
    const r = ledger(50000, 10000, 6000, 2000, 4000);
    expect(r.rentalPropertyTaxCredit).toBe(1600);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(1546);
    expect(r.financeCostsCarriedForward).toBe(2000);
  });

  it("carried in and carried forward again (limited by income above the allowance)", () => {
    // No salary; rent 18,000; interest 5,000; costs 2,000; 1,570 brought forward.
    // Relievable 6,570; ATI 3,430 is the lowest limit. Credit 686; tax 0;
    // 6,570 - 3,430 = 3,140 carries forward.
    const r = ledger(0, 18000, 5000, 2000, 1570);
    expect(r.rentalPropertyTaxCredit).toBe(686);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(0);
    expect(r.financeCostsCarriedForward).toBe(3140);
  });
});

/**
 * The amount brought forward as a tax record (owner-approved storage: one rental category,
 * `finance_costs_brought_forward`, in tax_records). It is the person's own figure from last
 * year's return, so the ownership share is not applied; it counts only in the tax year the
 * record is filed in; it is not a cost; and the property allowance route ignores it.
 */
describe.each(YEARS)("finance costs brought forward as a record, %s", (year) => {
  const bfRecord = (amount: number, inYear = year) =>
    rental(inYear, "finance_costs_brought_forward", amount);
  const base = (rent: number, interest: number, costs: number) => [
    rental(year, "rental_income", rent),
    rental(year, "mortgage_interest", interest),
    rental(year, "repairs_maintenance", costs),
  ];

  it("carried in and fully used: 2,000 joins 6,000 of interest", () => {
    // Salary 30,000; rent 15,000; interest 6,000; costs 2,000. Relievable 8,000 is below the
    // profit 13,000 and ATI 30,430: credit 1,600, tax on rent 2,600 - 1,600 = 1,000, none left.
    const r = calculateUKTax(year, [...base(15000, 6000, 2000), bfRecord(2000)], 30000, 100);
    expect(r.rentalExpensesExclInterest).toBe(2000);
    expect(r.financeCostsBroughtForward).toBe(2000);
    expect(r.rentalPropertyTaxCredit).toBe(1600);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(1000);
    expect(r.financeCostsCarriedForward).toBe(0);
  });

  it("carried in and partly used: profit is the limit", () => {
    // Salary 50,000; rent 10,000; interest 6,000; costs 2,000; 4,000 brought forward.
    // Relievable 10,000; profit 8,000: credit 1,600; 2,000 carries forward.
    const r = calculateUKTax(year, [...base(10000, 6000, 2000), bfRecord(4000)], 50000, 100);
    expect(r.rentalPropertyTaxCredit).toBe(1600);
    expect(r.financeCostsCarriedForward).toBe(2000);
  });

  it("carried in and carried forward again: income above the allowance is the limit", () => {
    // No salary; rent 18,000; interest 5,000; costs 2,000; 1,570 brought forward.
    // Relievable 6,570; ATI 3,430: credit 686; 3,140 carries forward.
    const r = calculateUKTax(year, [...base(18000, 5000, 2000), bfRecord(1570)], 0, 100);
    expect(r.rentalPropertyTaxCredit).toBe(686);
    expect(r.financeCostsCarriedForward).toBe(3140);
  });

  it("property allowance route wins and ignores it: the amount carries on unused", () => {
    // Salary 30,000; rent 900; costs 100; no interest; 500 brought forward.
    // Costs route: profit 800 x 20% = 160, credit 20% x 500 = 100, tax 60.
    // Allowance route: rent within the 1,000 allowance, tax 0 (s.783B(3)), no credit. The
    // allowance route wins, the 500 is not used, and it carries forward unchanged.
    const r = calculateUKTax(year, [...base(900, 0, 100), bfRecord(500)], 30000, 100);
    expect(r.propertyAllowanceUsed).toBe(900);
    expect(r.rentalPropertyTaxCredit).toBe(0);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(0);
    expect(r.financeCostsCarriedForward).toBe(500);
  });

  it("is not shared by ownership: a 50% owner uses all of their own 1,000", () => {
    // 50% of rent 30,000, costs 4,000, interest 6,000 = 15,000, 2,000, 3,000; salary 60,000.
    // Relievable 3,000 + 1,000 = 4,000; profit 13,000. Credit 800; tax 5,200 - 800 = 4,400.
    const r = calculateUKTax(year, [...base(30000, 6000, 4000), bfRecord(1000)], 60000, 50);
    expect(r.rentalPropertyTaxCredit).toBe(800);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(4400);
  });

  it("counts only in the tax year the record is filed in", () => {
    // A record filed in the previous year does not join this year's finance costs.
    const previous = `${Number(year.slice(0, 4)) - 1}/${year.slice(2, 4)}`;
    const r = calculateUKTax(
      year,
      [...base(15000, 6000, 2000), bfRecord(2000, previous)],
      30000,
      100,
    );
    expect(r.financeCostsBroughtForward).toBe(0);
    expect(r.rentalPropertyTaxCredit).toBe(1200);
  });
});
