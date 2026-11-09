import { describe, expect, it } from "vitest";
import { calculateSection24Tax } from "./section24.js";

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
});
