import { describe, expect, it } from "vitest";
import {
  calculatedMortgageInterest,
  calculatedSavingsInterest,
  grossRentalYieldPct,
} from "./calculated-tax-figures.js";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * "Calculated" figures offered for the user to confirm into a tax record (owner decision 5,
 * audit slice 7). Each is an estimate:
 * - Mortgage interest: each month of the tax year, the month's recorded balance x the yearly
 *   rate / 12, the rule the check-in's calculated balance uses (mortgage.ts amortiseOneMonth).
 *   A month with no record takes the latest earlier record; months before the first record are
 *   not counted (the loan was not held). Only interest counts, never capital (ITTOIA 2005
 *   s.272B(5)). Borrowing used for anything but the let property does not count (s.272B(2)); an
 *   account balance cannot show that.
 * - Savings interest: the month's balance x the monthly rate that compounds to the AER
 *   ((1 + AER)^(1/12) - 1, savings-interest.ts monthlyRateFromAer), at the person's share. Interest
 *   is taxed in the year it is paid or credited (ITTOIA 2005 s.370; HMRC SAIM2440), so an
 *   account that pays yearly may be taxed in another year.
 */

const TAX_YEAR = "2026/27";
/** Every month of 2026/27 at one balance (stored as a liability, so negative). */
const everyMonth = (value: number) => [
  ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => ({ year: 2026, month, value })),
  ...[1, 2, 3].map((month) => ({ year: 2027, month, value })),
];

describe("calculatedMortgageInterest", () => {
  it("interest-only 150,000 at 4.5% for the whole year: 6,750", () => {
    // 12 x 150,000 x 4.5% / 12 = 12 x 562.50 = 6,750.
    expect(
      calculatedMortgageInterest({
        taxYear: TAX_YEAR,
        ratePct: 4.5,
        balances: everyMonth(-150000),
      }),
    ).toEqual({ amount: 6750, monthsCounted: 12 });
  });

  it("a repayment loan counts only the interest on each month's falling balance", () => {
    // 200,000 in April, 500 less each month: 200,000, 199,500, ..., 194,500.
    // Sum of balances: 12 x 200,000 - 500 x (0 + 1 + ... + 11) = 2,400,000 - 33,000 = 2,367,000.
    // At 5%: 2,367,000 x 5% / 12 = 9,862.50. The capital repaid (6,000) does not count.
    const balances = everyMonth(0).map((b, i) => ({ ...b, value: -(200000 - 500 * i) }));
    expect(calculatedMortgageInterest({ taxYear: TAX_YEAR, ratePct: 5, balances })).toEqual({
      amount: 9862.5,
      monthsCounted: 12,
    });
  });

  it("a loan taken out in October counts six months", () => {
    // Interest-only 120,000 at 6%, first recorded in October 2026: October to March is 6 months
    // of 120,000 x 6% / 12 = 600, so 3,600.
    const balances = [{ year: 2026, month: 10, value: -120000 }];
    expect(calculatedMortgageInterest({ taxYear: TAX_YEAR, ratePct: 6, balances })).toEqual({
      amount: 3600,
      monthsCounted: 6,
    });
  });

  it("carries the latest balance into months with no record, including one from before the year", () => {
    // One record in March 2026 (the year before) of 150,000: every month of 2026/27 uses it.
    const balances = [{ year: 2026, month: 3, value: -150000 }];
    expect(calculatedMortgageInterest({ taxYear: TAX_YEAR, ratePct: 4.5, balances }).amount).toBe(
      6750,
    );
  });

  it("cannot be worked out with no rate or no balance", () => {
    expect(
      calculatedMortgageInterest({ taxYear: TAX_YEAR, ratePct: null, balances: everyMonth(-1) }),
    ).toBeNull();
    expect(calculatedMortgageInterest({ taxYear: TAX_YEAR, ratePct: 4, balances: [] })).toBeNull();
  });

  it("feeds the credit: 6,750 at a 50% share is a credit of 675; sole it is 1,350", () => {
    // Salary 30,000; rent 20,000 less 2,000 of costs. Sole: credit 20% x 6,750 = 1,350 (profit
    // 18,000 and income above the allowance are larger). At 50%: 20% x 3,375 = 675.
    const rec = (category: string, amount: number): TaxRecordFields => ({
      id: category,
      type: category === "rental_income" ? "income" : "expense",
      source: "rental",
      category,
      name: category,
      amount,
      frequency: "annual",
      date: "2026-06-06",
      endDate: null,
      notes: null,
    });
    const interest = calculatedMortgageInterest({
      taxYear: TAX_YEAR,
      ratePct: 4.5,
      balances: everyMonth(-150000),
    });
    const records = [
      rec("rental_income", 20000),
      rec("repairs_maintenance", 2000),
      rec("mortgage_interest", interest?.amount ?? 0),
    ];
    expect(calculateUKTax(TAX_YEAR, records, 30000, 100).rentalPropertyTaxCredit).toBe(1350);
    expect(calculateUKTax(TAX_YEAR, records, 30000, 50).rentalPropertyTaxCredit).toBe(675);
  });

  it("gives no credit when the property allowance beats claiming costs", () => {
    // Rent 900 with 300 of calculated interest: rent of 1,000 or less is covered by the property
    // allowance (ITTOIA 2005 s.783B(3)), which cannot be combined with the credit (s.783BL).
    // Salary 30,000. Tax on the rent 0, credit 0.
    const records: TaxRecordFields[] = [
      {
        id: "r",
        type: "income",
        source: "rental",
        category: "rental_income",
        name: "Rent",
        amount: 900,
        frequency: "annual",
        date: "2026-06-06",
        endDate: null,
        notes: null,
      },
      {
        id: "i",
        type: "expense",
        source: "rental",
        category: "mortgage_interest",
        name: "Interest",
        amount: 300,
        frequency: "annual",
        date: "2026-06-06",
        endDate: null,
        notes: null,
      },
    ];
    const r = calculateUKTax(TAX_YEAR, records, 30000, 100);
    expect(r.rentalPropertyTaxCredit).toBe(0);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(0);
  });

  it("is capped at income above the allowance, and the rest carries forward", () => {
    // No salary; rent 18,000 less 2,000 of costs (profit 16,000); calculated interest 5,000.
    // Income above the allowance: 16,000 - 12,570 = 3,430. Credit 20% x 3,430 = 686;
    // 5,000 - 3,430 = 1,570 carries forward (ITTOIA 2005 s.274AA(3), (4), (6)).
    const rec = (category: string, amount: number): TaxRecordFields => ({
      id: category,
      type: category === "rental_income" ? "income" : "expense",
      source: "rental",
      category,
      name: category,
      amount,
      frequency: "annual",
      date: "2026-06-06",
      endDate: null,
      notes: null,
    });
    const r = calculateUKTax(
      TAX_YEAR,
      [
        rec("rental_income", 18000),
        rec("repairs_maintenance", 2000),
        rec("mortgage_interest", 5000),
      ],
      0,
      100,
    );
    expect(r.rentalPropertyTaxCredit).toBe(686);
    expect(r.financeCostsCarriedForward).toBe(1570);
  });
});

describe("calculatedSavingsInterest", () => {
  it("20,000 at 4% AER for the whole year, sole: 785.70", () => {
    // Monthly rate (1.04)^(1/12) - 1: ln 1.04 = 0.0392207, / 12 = 0.00326839,
    // e^x = 1.00327374. 20,000 x 0.00327374 = 65.4748 a month, x 12 = 785.70 to the penny.
    expect(
      calculatedSavingsInterest({
        taxYear: TAX_YEAR,
        aerPct: 4,
        balances: everyMonth(20000),
        sharePercent: 100,
      }),
    ).toEqual({ amount: 785.7, monthsCounted: 12 });
  });

  it("a joint account at 50% counts half: 392.85", () => {
    expect(
      calculatedSavingsInterest({
        taxYear: TAX_YEAR,
        aerPct: 4,
        balances: everyMonth(20000),
        sharePercent: 50,
      })?.amount,
    ).toBe(392.85);
  });

  it("cannot be worked out with no rate", () => {
    expect(
      calculatedSavingsInterest({
        taxYear: TAX_YEAR,
        aerPct: null,
        balances: everyMonth(20000),
        sharePercent: 100,
      }),
    ).toBeNull();
  });
});

describe("grossRentalYieldPct", () => {
  it("rent for the year over the property's value", () => {
    // 1,150 a month for the year is 13,800; 13,800 / 230,000 = 6.0%.
    expect(grossRentalYieldPct({ rentForYear: 13800, propertyValue: 230000 })).toBeCloseTo(6, 6);
  });

  it("is not shown with no rent or no value", () => {
    expect(grossRentalYieldPct({ rentForYear: 0, propertyValue: 230000 })).toBeNull();
    expect(grossRentalYieldPct({ rentForYear: 13800, propertyValue: 0 })).toBeNull();
  });
});
