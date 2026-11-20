import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * How calculateUKTax adds up the records and stacks the income types, 2025/26, England, Wales
 * and NI. Hand-worked figures from GOV.UK, read 2026-11-19:
 * - Income Tax rates and Personal Allowances, 2025/26 (https://www.gov.uk/income-tax-rates):
 *   personal allowance 12,570; basic rate 20% on the first 37,700 of taxable income; higher
 *   rate 40% up to 125,140; allowance tapered above 100,000.
 * - Tax on savings interest (https://www.gov.uk/apply-tax-free-interest-on-savings): starting
 *   rate for savings 5,000 at 0%, reduced 1 for 1 by non-savings income above the allowance;
 *   personal savings allowance 1,000 basic rate, 500 higher rate.
 * - Tax on dividends, 2025/26 (https://www.gov.uk/tax-on-dividends): allowance 500; 8.75% basic,
 *   33.75% higher. The allowance and the savings bands still use up band space.
 * - Self-employed National Insurance rates, 2025/26: Class 4 6% from 12,570 to 50,270.
 * - Tax-free allowances on property and trading income: 1,000 each.
 * - Understand your Self Assessment tax bill, payments on account: each is half the bill, due
 *   31 January and 31 July, unless the bill is under 1,000 or 80% or more of the year's tax was
 *   taken at source.
 */
const Y = "2025/26";

let n = 0;
const rec = (
  source: TaxRecordFields["source"],
  category: string,
  amount: number,
  over: Partial<TaxRecordFields> = {},
): TaxRecordFields => ({
  id: `r${++n}`,
  type: "income",
  source,
  category,
  name: category,
  amount,
  frequency: "one-off",
  date: "2025-06-01",
  endDate: null,
  notes: null,
  ...over,
});
const interest = (amount: number) => rec("savings", "savings_interest", amount);
const dividends = (amount: number) => rec("savings", "dividend_income", amount);

describe("adding up the records", () => {
  it("adds two records in the same category and month", () => {
    const r = calculateUKTax(
      Y,
      [
        rec("rental", "rental_income", 1000),
        rec("rental", "rental_income", 500),
        rec("self-employed", "self_employed_income", 3000),
        rec("self-employed", "self_employed_income", 2000),
        interest(300),
        interest(200),
      ],
      0,
      100,
    );
    expect(r.rentalIncomeGross).toBe(1500);
    expect(r.seIncomeGross).toBe(5000);
    expect(r.savingsInterestGross).toBe(500);
  });

  it("ignores a record whose category its source does not have", () => {
    const r = calculateUKTax(
      Y,
      [
        rec("self-employed", "made_up", 999),
        rec("paye", "made_up", 999),
        rec("savings", "made_up", 999),
        rec("rental", "made_up", 999),
      ],
      0,
      100,
    );
    expect(r.seIncomeGross + r.seExpenses).toBe(0);
    expect(r.payeIncomeGross + r.payeExpenses).toBe(0);
    expect(r.savingsInterestGross + r.dividendIncomeGross + r.savingsExpenses).toBe(0);
    expect(r.rentalIncomeGross + r.rentalExpensesExclInterest).toBe(0);
  });

  it("ignores a negative amount", () => {
    const r = calculateUKTax(Y, [interest(-1000), interest(2000)], 0, 100);
    expect(r.savingsInterestGross).toBe(2000);
  });

  it("keeps ISA interest apart and out of taxable income", () => {
    const r = calculateUKTax(Y, [rec("savings", "isa_interest", 1000)], 0, 100);
    expect(r.isaInterestGross).toBe(1000);
    expect(r.savingsInterestGross).toBe(0);
    expect(r.totalGrossIncome).toBe(0);
  });

  it("records investment fees as a savings expense, not against dividends", () => {
    const r = calculateUKTax(
      Y,
      [interest(3000), rec("savings", "investment_fees", 500, { type: "expense" })],
      60000,
      100,
    );
    expect(r.savingsExpenses).toBe(500);
    expect(r.dividendIncomeGross).toBe(0);
    // The tax on the interest is not asserted: the engine takes the fees off the interest
    // before tax, but UK law gives an individual no deduction for investment fees against
    // savings interest. Reported to the coordinator as a possible bug (E41 M2).
  });
});

describe("finance costs brought forward records", () => {
  // Salary 30,000; rent 15,000; interest 6,000; costs 2,000 (the 807 case, where all of a 2,000
  // amount brought forward is used). Only the amount read from the record is checked here.
  const base = [
    rec("rental", "rental_income", 15000),
    rec("rental", "mortgage_interest", 6000, { type: "expense" }),
    rec("rental", "repairs_maintenance", 2000, { type: "expense" }),
  ];
  const bf = (amount: number | string, source: TaxRecordFields["source"] = "rental") =>
    rec(source, "finance_costs_brought_forward", 0, { type: "expense", amount });

  it("reads an amount stored as text", () => {
    expect(calculateUKTax(Y, [...base, bf("2000")], 30000, 100).financeCostsBroughtForward).toBe(
      2000,
    );
  });

  it("ignores a negative amount or one that is not a number", () => {
    expect(calculateUKTax(Y, [...base, bf(-500)], 30000, 100).financeCostsBroughtForward).toBe(0);
    expect(calculateUKTax(Y, [...base, bf("abc")], 30000, 100).financeCostsBroughtForward).toBe(0);
  });

  it("counts only a rental record, not the same category under another source", () => {
    const r = calculateUKTax(Y, [...base, bf(2000, "savings"), bf(2000, "paye")], 30000, 100);
    expect(r.financeCostsBroughtForward).toBe(0);
  });
});

describe("salary records and the saved salary", () => {
  it("a bonus for the whole year adds to the saved salary, it does not replace it", () => {
    const bonus = rec("paye", "paye_bonus", 5000, { frequency: "annual", date: "2025-05-01" });
    // 50,000 saved + 5,000 bonus = 55,000.
    expect(calculateUKTax(Y, [bonus], 50000, 100).effectivePayeSalary).toBe(55000);
  });

  it("a yearly salary record from another year leaves the saved salary in place", () => {
    const lastYear = rec("paye", "paye_salary", 40000, { frequency: "annual", date: "2024-05-01" });
    expect(calculateUKTax(Y, [lastYear], 50000, 100).effectivePayeSalary).toBe(50000);
  });

  it("a monthly bonus does not count as a payslip", () => {
    const bonus = rec("paye", "paye_bonus", 100, { frequency: "monthly", date: "2025-04-10" });
    // 60,000 saved for all twelve months + 100 x 12 = 61,200.
    expect(calculateUKTax(Y, [bonus], 60000, 100).effectivePayeSalary).toBe(61200);
  });
});

describe("rental figures for a joint owner", () => {
  it("each share is the owned part of the whole", () => {
    const r = calculateUKTax(
      Y,
      [
        rec("rental", "rental_income", 10000),
        rec("rental", "repairs_maintenance", 2000, { type: "expense" }),
        rec("rental", "mortgage_interest", 3000, { type: "expense" }),
      ],
      0,
      50,
    );
    // Profit after costs 10,000 - 2,000 = 8,000; after interest 8,000 - 3,000 = 5,000.
    expect(r.rentalProfitPostInterest).toBe(5000);
    // Half of each: 5,000 profit, 1,000 costs, 1,500 interest, 2,500 profit after interest.
    expect(r.rentalIncomeGrossShare).toBe(5000);
    expect(r.rentalExpensesExclInterestShare).toBe(1000);
    expect(r.rentalMortgageInterestShare).toBe(1500);
    expect(r.rentalProfitPostInterestShare).toBe(2500);
  });

  it("with no rent the two property routes tie and no allowance is used", () => {
    const r = calculateUKTax(Y, [], 30000, 100);
    expect(r.propertyRoutesTie).toBe(true);
    expect(r.propertyAllowanceUsed).toBe(0);
  });
});

describe("tax split by source", () => {
  it("30,000 salary and 20,000 trading income: tax on the profit, Class 4 and payments", () => {
    const r = calculateUKTax(Y, [rec("self-employed", "self_employed_income", 20000)], 30000, 100);
    // No costs, so the 1,000 trading allowance: profit 19,000.
    expect(r.seProfit).toBe(19000);
    // PAYE: 30,000 - 12,570 = 17,430 x 20% = 3,486.
    expect(r.payeTaxDue).toBe(3486);
    // All income: 49,000 - 12,570 = 36,430 x 20% = 7,286; less PAYE 3,486 = 3,800 on the profit.
    expect(r.seTaxDue).toBe(3800);
    expect(r.totalIncomeTaxDue).toBe(7286);
    // Class 4: (19,000 - 12,570) x 6% = 385.80.
    expect(r.seClass4NIDue).toBeCloseTo(385.8, 2);
    // 7,286 + 385.80 = 7,671.80; less PAYE 3,486 = 4,185.80 still to pay.
    expect(r.totalTaxDue).toBeCloseTo(7671.8, 2);
    expect(r.netAdditionalTaxToPay).toBeCloseTo(4185.8, 2);
    // 4,185.80 is over 1,000 and 3,486 is under 80% of 7,671.80 (6,137.44), so payments on
    // account are due: half the bill, 2,092.90. 31 Jan 2027: 4,185.80 + 2,092.90 = 6,278.70.
    expect(r.payments.balancingPayment).toBeCloseTo(4185.8, 2);
    expect(r.payments.paymentsOnAccountDue).toBe(true);
    expect(r.payments.paymentOnAccount).toBeCloseTo(2092.9, 2);
    expect(r.payments.january.date).toBe("2027-01-31");
    expect(r.payments.january.amount).toBeCloseTo(6278.7, 2);
    expect(r.payments.july).toEqual({ date: "2027-07-31", amount: r.payments.paymentOnAccount });
  });

  it("30,000 salary and 10,000 rent with 2,000 costs: tax on the rent", () => {
    const r = calculateUKTax(
      Y,
      [
        rec("rental", "rental_income", 10000),
        rec("rental", "repairs_maintenance", 2000, { type: "expense" }),
      ],
      30000,
      100,
    );
    // Costs 2,000 beat the 1,000 property allowance: profit 8,000.
    expect(r.propertyAllowanceUsed).toBe(0);
    // All income: 38,000 - 12,570 = 25,430 x 20% = 5,086; salary alone 3,486; rent 1,600.
    expect(r.rentalPropertyTaxDueBeforeCredit).toBe(1600);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(1600);
    expect(r.totalIncomeTaxDue).toBe(5086);
    expect(r.netAdditionalTaxToPay).toBe(1600);
  });

  it("taxable income is total income less the personal allowance", () => {
    // 60,000 - 12,570 = 47,430.
    expect(calculateUKTax(Y, [], 60000, 100).totalTaxableIncome).toBe(47430);
  });
});

describe("personal savings allowance band", () => {
  it("is 1,000 at taxable income of exactly 37,700 and 500 one pound above", () => {
    // 49,270 salary + 1,000 interest = 50,270; less 12,570 = 37,700: still basic rate.
    const at = calculateUKTax(Y, [interest(1000)], 49270, 100);
    expect(at.personalSavingsAllowance).toBe(1000);
    expect(at.savingsTaxDue).toBe(0);
    // 49,271 + 1,000 - 12,570 = 37,701: higher rate, PSA 500.
    // Non-savings first (the old order): non-savings taxable 36,701 x 20% = 7,340.20; the 500 PSA
    //   fills to 37,201; then 499 at 20% = 99.80 and 1 at 40% = 0.40: 100.20; total 7,440.40.
    // Lowest (ITA 2007 s.25(2)): move 500 of allowance to the interest. Non-savings taxable
    //   37,201 x 20% = 7,440.20; the 500 of interest left sits in the PSA: total 7,440.20.
    // The non-savings line stays 7,340.20, so the savings line is 100.20 - 0.20 = 100.00.
    const over = calculateUKTax(Y, [interest(1000)], 49271, 100);
    expect(over.personalSavingsAllowance).toBe(500);
    expect(over.allowanceOnSavings).toBe(500);
    expect(over.savingsTaxDue).toBeCloseTo(100, 2);
    expect(over.totalIncomeTaxDue).toBeCloseTo(7440.2, 2);
  });
});

describe("stacking savings and dividends", () => {
  it("the starting rate and PSA together never cover more than the interest", () => {
    // No salary; 18,170 interest: 12,570 allowance, 5,000 starting rate, 600 left for the
    // 1,000 PSA. Nothing is taxable.
    const r = calculateUKTax(Y, [interest(18170)], 0, 100);
    expect(r.taxableSavingsInterest).toBe(0);
    expect(r.savingsTaxDue).toBe(0);
  });

  it("the PSA uses band space below the taxed interest", () => {
    // 49,270 salary + 3,000 interest = 52,270; taxable 39,700, higher rate, PSA 500.
    // Non-savings first (the old order): non-savings taxable 36,700 x 20% = 7,340; PSA to
    //   37,200; 500 at 20% = 100; 2,000 at 40% = 800: 900; total 8,240.
    // Lowest (ITA 2007 s.25(2)): move 1,000 of allowance to the interest, so non-savings taxable
    //   is 37,700 x 20% = 7,540 (+200) and the PSA sits on 37,700 to 38,200: 2,000 - 500 = 1,500
    //   at 40% = 600 (-300). Total 8,140. Moving more ties (40% against 40%), so 1,000 is kept.
    // The non-savings line stays 7,340, so the savings line is 900 - 100 = 800.
    const r = calculateUKTax(Y, [interest(3000)], 49270, 100);
    expect(r.allowanceOnSavings).toBe(1000);
    expect(r.taxableSavingsInterest).toBe(1500);
    expect(r.savingsTaxDue).toBeCloseTo(800, 2);
    expect(r.totalIncomeTaxDue).toBeCloseTo(8140, 2);
  });

  it("allowance goes to dividends when the starting rate already covers the interest", () => {
    // No salary; 4,000 interest, 20,000 dividends; taxable 11,430, PSA 1,000.
    // The old order set 4,000 of allowance against the interest, leaving 8,570 for dividends:
    //   11,430 - 500 = 10,930 at 8.75% = 956.375.
    // The 4,000 of interest is inside the 5,000 starting rate anyway, so the lowest bill puts all
    // 12,570 against dividends (ITA 2007 s.25(2)): 7,430 - 500 = 6,930 at 8.75% = 606.375.
    const r = calculateUKTax(Y, [interest(4000), dividends(20000)], 0, 100);
    expect(r.allowanceOnSavings).toBe(0);
    expect(r.allowanceOnDividends).toBe(12570);
    expect(r.savingsTaxDue).toBe(0);
    expect(r.taxableDividends).toBe(6930);
    expect(r.dividendTaxDue).toBeCloseTo(606.375, 2);
  });

  it("dividends stack above the interest and cross into the higher rate", () => {
    // 40,000 salary + 2,000 interest + 10,000 dividends = 52,000; taxable 39,430: PSA 500.
    // Interest: 500 PSA, 1,500 at 20% = 300.
    // Dividends start above 27,430 + 2,000 interest + 500 allowance = 29,930 and end at 39,430:
    // 7,770 at 8.75% = 679.875; 1,730 at 33.75% = 583.875; total 1,263.75.
    const r = calculateUKTax(Y, [interest(2000), dividends(10000)], 40000, 100);
    expect(r.savingsTaxDue).toBeCloseTo(300, 2);
    expect(r.taxableDividends).toBe(9500);
    expect(r.dividendTaxDue).toBeCloseTo(1263.75, 2);
  });
});
