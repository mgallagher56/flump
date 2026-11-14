import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * The trading and property allowances and the Class 4 limits in the Self Assessment ledger
 * (2026/27, England, Wales and NI). Hand-worked figures.
 * Sources (read 2026-11-14):
 * - https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income
 * - https://www.gov.uk/self-employed-national-insurance-rates (Class 4: 6% from 12,570 to 50,270, 2% above)
 * Personal allowance 12,570; basic rate 20% on the next 37,700; higher rate 40%.
 */
const Y = "2026/27";

let n = 0;
const annual = (
  source: TaxRecordFields["source"],
  category: string,
  amount: number,
  type: TaxRecordFields["type"] = "expense",
): TaxRecordFields => ({
  id: `r${++n}`,
  type,
  source,
  category,
  name: category,
  amount,
  frequency: "annual",
  date: "2026-04-06",
  endDate: "2027-04-05",
  notes: null,
});
const trading = (amount: number) =>
  annual("self-employed", "self_employed_income", amount, "income");
const tradingCost = (amount: number) => annual("self-employed", "office_costs", amount);
const rent = (amount: number) => annual("rental", "rental_income", amount, "income");
const rentCost = (amount: number) => annual("rental", "repairs_maintenance", amount);
const interest = (amount: number) => annual("rental", "mortgage_interest", amount);

describe("trading allowance", () => {
  it("is used in place of costs that are smaller: 5,000 income, 300 costs", () => {
    const r = calculateUKTax(Y, [trading(5000), tradingCost(300)], 30000, 100);
    expect(r.seProfit).toBe(4000);
    expect(r.tradingAllowanceUsed).toBe(1000);
    // 4,000 at the basic rate on top of a 30,000 salary: 800. Under the Class 4 lower limit.
    expect(r.netAdditionalTaxToPay).toBe(800);
  });

  it("is not used when the recorded costs are larger: 5,000 income, 1,800 costs", () => {
    const r = calculateUKTax(Y, [trading(5000), tradingCost(1800)], 30000, 100);
    expect(r.seProfit).toBe(3200);
    expect(r.tradingAllowanceUsed).toBe(0);
    expect(r.netAdditionalTaxToPay).toBe(640);
  });

  it("covers income of 1,000 or less in full", () => {
    const r = calculateUKTax(Y, [trading(800)], 30000, 100);
    expect(r.seProfit).toBe(0);
    expect(r.tradingAllowanceUsed).toBe(800);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });
});

describe("Class 4 National Insurance limits", () => {
  it("charges 6% up to the upper profits limit and 2% above it", () => {
    const r = calculateUKTax(Y, [trading(60000)], 0, 100);
    // Profit 60,000 - 1,000 allowance = 59,000.
    // Class 4: (50,270 - 12,570) x 6% = 2,262; (59,000 - 50,270) x 2% = 174.60. Total 2,436.60.
    expect(r.seClass4NIDue).toBe(2436.6);
    // Income Tax: 46,430 taxable; 7,540 + 8,730 x 40% = 11,032.
    expect(r.totalIncomeTaxDue).toBe(11032);
    expect(r.netAdditionalTaxToPay).toBe(13468.6);
  });

  it("charges only the main rate when profit is under the upper limit", () => {
    const r = calculateUKTax(Y, [trading(60000), tradingCost(10000)], 0, 100);
    // Profit 50,000: (50,000 - 12,570) x 6% = 2,245.80.
    expect(r.seClass4NIDue).toBe(2245.8);
  });

  it("charges nothing at or under the lower profits limit", () => {
    expect(calculateUKTax(Y, [trading(13570)], 0, 100).seClass4NIDue).toBe(0);
  });
});

describe("property allowance", () => {
  it("covers rent of 1,000 or less in full", () => {
    const r = calculateUKTax(Y, [rent(900)], 30000, 100);
    expect(r.propertyAllowanceUsed).toBe(900);
    expect(r.rentalProfitBeforeInterestShare).toBe(0);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });

  it("is not used when the recorded costs are larger: 6,000 rent, 2,500 costs", () => {
    const r = calculateUKTax(Y, [rent(6000), rentCost(2500)], 30000, 100);
    expect(r.propertyAllowanceUsed).toBe(0);
    expect(r.rentalProfitBeforeInterestShare).toBe(3500);
    expect(r.netAdditionalTaxToPay).toBe(700);
  });

  it("each joint owner has it against their own share of the rent", () => {
    const r = calculateUKTax(Y, [rent(3000)], 30000, 50);
    // Own share 1,500 - 1,000 = 500 at 20%.
    expect(r.propertyAllowanceUsed).toBe(1000);
    expect(r.rentalProfitBeforeInterestShare).toBe(500);
    expect(r.netAdditionalTaxToPay).toBe(100);
  });

  describe("cannot be used alongside finance cost relief, so the lower total is kept", () => {
    it("keeps costs and the finance cost credit when that total is lower", () => {
      const r = calculateUKTax(Y, [rent(6000), rentCost(200), interest(3000)], 30000, 100);
      // Costs route: 5,800 x 20% = 1,160, less the credit 3,000 x 20% = 600: 560.
      // Allowance route: 5,000 x 20% = 1,000 with no credit.
      expect(r.propertyAllowanceUsed).toBe(0);
      expect(r.rentalPropertyTaxCredit).toBe(600);
      expect(r.netAdditionalTaxToPay).toBe(560);
    });

    it("uses the allowance, with no costs and no credit, when that total is lower", () => {
      const r = calculateUKTax(Y, [rent(6000), rentCost(100), interest(200)], 30000, 100);
      // Costs route: 5,900 x 20% = 1,180, less the credit 200 x 20% = 40: 1,140.
      // Allowance route: 5,000 x 20% = 1,000.
      expect(r.propertyAllowanceUsed).toBe(1000);
      expect(r.rentalProfitBeforeInterestShare).toBe(5000);
      expect(r.rentalPropertyTaxCredit).toBe(0);
      expect(r.netAdditionalTaxToPay).toBe(1000);
      // What was recorded is still reported as recorded.
      expect(r.rentalMortgageInterestShare).toBe(200);
      expect(r.rentalExpensesExclInterest).toBe(100);
    });
  });
});
