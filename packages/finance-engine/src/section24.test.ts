import { describe, expect, it } from "vitest";
import { calculateSection24LandlordTax, calculateSection24Tax } from "./section24.js";

describe("section24 module", () => {
  it("applies Section 24 20% tax reducer on mortgage interest", () => {
    // Landlord earning £60k PAYE (Higher Rate 40%), £18k rental income, £2k expenses, £8k mortgage interest
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: 18000,
      allowableExpensesGbp: 2000,
      mortgageInterestGbp: 8000,
      otherTaxableIncomeGbp: 60000,
      ownershipSharePct: 100,
    });

    // Net rental profit before finance costs = 18k - 2k = 16k
    expect(res.taxableRentalProfitGbp).toBe(16000);
    // 20% basic rate credit on £8,000 mortgage interest = £1,600
    expect(res.section24TaxCreditGbp).toBe(1600);
    // In Higher Rate band (40%): tax on £16k = £6,400.
    // Net tax liability = £6,400 - £1,600 = £4,800
    expect(res.netRentalTaxLiabilityGbp).toBe(4800);
    expect(res.recommendedMonthlyTaxSetAsideGbp).toBe(400); // 4800 / 12
  });

  it("calculates 31 Jan and 31 July Payments on Account liabilities for tax bills >= £1,000", () => {
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: 24000,
      allowableExpensesGbp: 3000,
      mortgageInterestGbp: 9000,
      otherTaxableIncomeGbp: 75000,
    });

    expect(res.netRentalTaxLiabilityGbp).toBeGreaterThan(1000);
    // 31 Jan payment includes balancing payment + 50% first payment on account
    expect(res.balancingPayment31JanGbp).toBe(res.netRentalTaxLiabilityGbp);
    expect(res.firstPaymentOnAccount31JanGbp).toBe(
      Math.round(res.netRentalTaxLiabilityGbp * 0.5 * 100) / 100,
    );
    expect(res.totalDue31JanGbp).toBe(
      res.balancingPayment31JanGbp + res.firstPaymentOnAccount31JanGbp,
    );
    // 31 July payment is 50% second payment on account
    expect(res.totalDue31JulyGbp).toBe(res.firstPaymentOnAccount31JanGbp);
  });

  it("handles 50% joint property ownership split", () => {
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: 20000,
      allowableExpensesGbp: 2000,
      mortgageInterestGbp: 6000,
      otherTaxableIncomeGbp: 40000,
      ownershipSharePct: 50,
    });

    expect(res.shareRentalIncomeGbp).toBe(10000);
    expect(res.shareAllowableExpensesGbp).toBe(1000);
    expect(res.shareMortgageInterestGbp).toBe(3000);
    expect(res.section24TaxCreditGbp).toBe(600); // 20% of 3,000
  });

  it("calculateSection24LandlordTax returns compatibility fields", () => {
    const res = calculateSection24LandlordTax(60000, 18000, 8000, 2000, 100);
    expect(res.actualCashProfit).toBe(8000);
    expect(res.section24TaxableProfit).toBe(16000);
    expect(res.finalTaxDue).toBe(4800);
    expect(res.financeCredit).toBe(1600);
  });

  it("applies the Personal Allowance taper when total income passes £100,000", () => {
    // £110,000 other income + £16,000 rental profit = £126,000: the allowance is fully lost.
    // Tax on £126,000 (no allowance) = 7,540 + 34,976 + 387 = £42,903.
    // Tax on £110,000 (allowance £7,570) = 7,540 + 25,892 = £33,432.
    // Rental slice £9,471, less the £1,600 finance cost credit = £7,871.
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: 18000,
      allowableExpensesGbp: 2000,
      mortgageInterestGbp: 8000,
      otherTaxableIncomeGbp: 110000,
      taxYear: "2026/27",
    });
    expect(res.netRentalTaxLiabilityGbp).toBe(7871);
  });

  it("gives the same answer as the flat bands below the taper", () => {
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: 18000,
      allowableExpensesGbp: 2000,
      mortgageInterestGbp: 8000,
      otherTaxableIncomeGbp: 32000,
      taxYear: "2026/27",
    });
    // £16,000 at 20% = £3,200, less £1,600 credit.
    expect(res.netRentalTaxLiabilityGbp).toBe(1600);
  });

  it("shows a cash loss after tax instead of flooring it at zero", () => {
    // Higher-rate landlord: £12,000 rent, £1,000 costs, £11,500 mortgage interest.
    // Taxable profit £11,000 (interest not deducted), taxed at 40% = £4,400.
    // Credit 20% of min(£11,500, £11,000) = £2,200, so tax due £2,200.
    // Cash before tax 12,000 - 1,000 - 11,500 = -£500; after tax -£2,700.
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: 12000,
      allowableExpensesGbp: 1000,
      mortgageInterestGbp: 11500,
      otherTaxableIncomeGbp: 60000,
    });
    expect(res.taxableRentalProfitGbp).toBe(11000);
    expect(res.netRentalTaxLiabilityGbp).toBe(2200);
    expect(res.actualCashProfit).toBe(-500);
    expect(res.netRentalIncomeAfterTax).toBe(-2700);
  });

  it("can owe tax with a cash profit before tax but a loss after it", () => {
    // £16,000 taxable profit at 40% = £6,400; credit 20% of £13,000 interest = £2,600; tax £3,800.
    // Cash before tax 18,000 - 2,000 - 13,000 = £3,000; after tax -£800.
    const res = calculateSection24LandlordTax(60000, 18000, 13000, 2000);
    expect(res.actualCashProfit).toBe(3000);
    expect(res.financeCredit).toBe(2600);
    expect(res.finalTaxDue).toBe(3800);
    expect(res.netRentalIncomeAfterTax).toBe(-800);
  });

  it("keeps tax at zero or above when there is a loss", () => {
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: 6000,
      allowableExpensesGbp: 1000,
      mortgageInterestGbp: 9000,
      otherTaxableIncomeGbp: 30000,
    });
    // Taxable profit £5,000 at 20% = £1,000; credit 20% of £5,000 = £1,000: no tax.
    expect(res.netRentalTaxLiabilityGbp).toBe(0);
    expect(res.actualCashProfit).toBe(-4000);
    expect(res.netRentalIncomeAfterTax).toBe(-4000);
  });

  it("floors negative inputs before working out the result", () => {
    const res = calculateSection24Tax({
      grossRentalIncomeGbp: -5000,
      allowableExpensesGbp: -100,
      mortgageInterestGbp: -200,
      otherTaxableIncomeGbp: -1000,
    });
    expect(res.netRentalTaxLiabilityGbp).toBe(0);
    expect(res.actualCashProfit).toBe(0);
    expect(res.netRentalIncomeAfterTax).toBe(0);
  });
});

/**
 * One model: the public calculator's figures come from calculateUKTax, so it and the signed-in
 * Self Assessment estimate agree. Sole owner, England, Wales and Northern Ireland bands. Every
 * figure used is the same in 2025/26 and 2026/27: Personal Allowance 12,570 tapered from 100,000
 * (ITA 2007 s.35), basic rate band 37,700 at 20%, higher 40%, additional 45% above 125,140,
 * property allowance 1,000 (ITTOIA 2005 s.783B), finance cost credit at the 20% basic rate.
 *
 * Credit (ITTOIA 2005 s.274AA): 20% of the lowest of the finance costs, the property profit and
 * adjusted total income (net income less savings and dividends, less the Personal Allowance).
 * Tax on rent = tax with the rent minus tax without it, less the credit.
 */
const PR805_CASES = [
  {
    // Profit 13,000 all at 20% = 2,600; credit 20% x 6,000 = 1,200; 1,400.
    case: "basic-rate employee",
    salary: 30000,
    rent: 15000,
    interest: 6000,
    costs: 2000,
    credit: 1200,
    tax: 1400,
  },
  {
    // Salary already above 50,270: profit 13,000 at 40% = 5,200; less 1,200 = 4,000.
    case: "higher-rate employee",
    salary: 60000,
    rent: 15000,
    interest: 6000,
    costs: 2000,
    credit: 1200,
    tax: 4000,
  },
  {
    // No allowance either way: profit 21,000 at 45% = 9,450; credit 20% x 12,000 = 2,400; 7,050.
    case: "additional-rate employee",
    salary: 150000,
    rent: 24000,
    interest: 12000,
    costs: 3000,
    credit: 2400,
    tax: 7050,
  },
  {
    // With rent: allowance 12,570 - 13,000/2 = 6,070, taxable 106,930, tax 7,540 + 27,692 =
    // 35,232. Without: taxable 82,430, tax 7,540 + 17,892 = 25,432. 9,800 - 1,600 = 8,200.
    case: "allowance taper",
    salary: 95000,
    rent: 20000,
    interest: 8000,
    costs: 2000,
    credit: 1600,
    tax: 8200,
  },
  {
    // Profit 8,000. Taxable 37,430 -> 45,430: 7,486 -> 7,540 + 7,730 x 40% = 10,632; 3,146.
    // Credit 20% x min(9,000, 8,000) = 1,600; 1,546. (1,000 of interest carries forward.)
    case: "interest above profit",
    salary: 50000,
    rent: 10000,
    interest: 9000,
    costs: 2000,
    credit: 1600,
    tax: 1546,
  },
  {
    // Profit 16,000, taxable 3,430 at 20% = 686. Adjusted total income 3,430 caps the credit:
    // 20% x 3,430 = 686 (was 20% x 5,000 = 1,000). Tax 0 either way.
    case: "no other income",
    salary: 0,
    rent: 18000,
    interest: 5000,
    costs: 2000,
    credit: 686,
    tax: 0,
  },
  {
    // Rent 900 is within the 1,000 property allowance: not charged (s.783B(3)). Was 800 x 20%.
    case: "small rent",
    salary: 30000,
    rent: 900,
    interest: 0,
    costs: 100,
    credit: 0,
    tax: 0,
  },
  {
    // Taxable 47,430: 7,540 + 9,730 x 40% = 11,432. Credit capped at adjusted total income:
    // 20% x 47,430 = 9,486 (not 20% x 50,000 = 10,000), so 1,946 (was 1,432).
    case: "large interest, no other income",
    salary: 0,
    rent: 60000,
    interest: 50000,
    costs: 0,
    credit: 9486,
    tax: 1946,
  },
  {
    // Costs 500 are below the 1,000 property allowance: 14,000 x 20% = 2,800 beats
    // 14,500 x 20% = 2,900 (s.783B(4) alternative calculation; no finance costs to lose).
    case: "costs below the property allowance",
    salary: 30000,
    rent: 15000,
    interest: 0,
    costs: 500,
    credit: 0,
    tax: 2800,
  },
] as const;

describe.each(["2025/26", "2026/27"] as const)(
  "calculator cases through the engine, %s",
  (year) => {
    it.each(PR805_CASES)("$case", (c) => {
      const res = calculateSection24Tax({
        grossRentalIncomeGbp: c.rent,
        allowableExpensesGbp: c.costs,
        mortgageInterestGbp: c.interest,
        otherTaxableIncomeGbp: c.salary,
        taxYear: year,
      });
      expect(res.section24TaxCreditGbp).toBe(c.credit);
      expect(res.netRentalTaxLiabilityGbp).toBe(c.tax);
      // Cash left: rent less costs less interest less tax.
      expect(res.netRentalIncomeAfterTax).toBe(c.rent - c.costs - c.interest - c.tax);
    });

    it("shows the small rent as untaxed profit of 800 cash and a 0% tax share", () => {
      const res = calculateSection24LandlordTax(30000, 900, 0, 100, 100, year);
      expect(res.propertyAllowanceUsedGbp).toBe(900);
      expect(res.taxableRentalProfitGbp).toBe(0);
      expect(res.finalTaxDue).toBe(0);
      expect(res.effectiveTaxRate).toBe(0);
      expect(res.netRentalIncomeAfterTax).toBe(800);
    });
  },
);

describe.each(["2025/26", "2026/27"] as const)(
  "calculator finance costs carried forward, %s",
  (year) => {
    const run = (salary: number, rent: number, interest: number, costs: number, bf?: number) =>
      calculateSection24Tax({
        grossRentalIncomeGbp: rent,
        allowableExpensesGbp: costs,
        mortgageInterestGbp: interest,
        otherTaxableIncomeGbp: salary,
        financeCostsBroughtForwardGbp: bf,
        taxYear: year,
      });

    it("reports what carries forward when income above the allowance is the limit", () => {
      // No salary; rent 18,000; interest 5,000; costs 2,000: 3,430 used, 1,570 carries forward.
      const res = run(0, 18000, 5000, 2000);
      expect(res.financeCostsBroughtForwardGbp).toBe(0);
      expect(res.financeCostsCarriedForwardGbp).toBe(1570);
    });

    it("uses an amount brought forward under the same limits", () => {
      // Salary 50,000; rent 10,000; interest 6,000; costs 2,000; 4,000 brought forward.
      // Relievable 10,000, profit 8,000 limits: credit 1,600, tax 1,546, 2,000 carries forward.
      const res = run(50000, 10000, 6000, 2000, 4000);
      expect(res.financeCostsBroughtForwardGbp).toBe(4000);
      expect(res.section24TaxCreditGbp).toBe(1600);
      expect(res.finalTaxDue).toBe(1546);
      expect(res.financeCostsCarriedForwardGbp).toBe(2000);
      // Cash left counts this year's interest only: 10,000 - 2,000 - 6,000 - 1,546 = 454.
      expect(res.netRentalIncomeAfterTax).toBe(454);
    });

    it("does not apply the ownership share to an amount brought forward", () => {
      // 50% of rent 30,000, costs 4,000, interest 6,000: 15,000, 2,000, 3,000; salary 60,000.
      // Brought forward 1,000 (already this owner's own). Relievable 3,000 + 1,000 = 4,000;
      // profit 13,000. Credit 20% x 4,000 = 800. Tax 13,000 x 40% - 800 = 4,400.
      const res = calculateSection24Tax({
        grossRentalIncomeGbp: 30000,
        allowableExpensesGbp: 4000,
        mortgageInterestGbp: 6000,
        otherTaxableIncomeGbp: 60000,
        ownershipSharePct: 50,
        financeCostsBroughtForwardGbp: 1000,
        taxYear: year,
      });
      expect(res.section24TaxCreditGbp).toBe(800);
      expect(res.finalTaxDue).toBe(4400);
      expect(res.financeCostsCarriedForwardGbp).toBe(0);
    });
  },
);
