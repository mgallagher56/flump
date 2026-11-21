import { describe, expect, it } from "vitest";
import {
  calculateBudgetLoanEstimate,
  calculateIncomeMultipleRange,
  DEFAULT_INCOME_MULTIPLE_HIGH,
  DEFAULT_INCOME_MULTIPLE_LOW,
} from "./mortgage-affordability.js";

describe("mortgage affordability (E39 section 4a & 10a)", () => {
  describe("calculateIncomeMultipleRange", () => {
    it("worked case 1: £38,000 + £27,000 = £65,000 -> £260,000 to £292,500", () => {
      // E39 section 8 case 1:
      // Combined income: 38000 + 27000 = 65000
      // Low (4x): 65000 * 4 = 260000
      // High (4.5x): 65000 * 4.5 = 292500
      const res = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 38000,
        secondAnnualIncomeGbp: 27000,
      });
      expect(DEFAULT_INCOME_MULTIPLE_LOW).toBe(4);
      expect(DEFAULT_INCOME_MULTIPLE_HIGH).toBe(4.5);
      expect(res.combinedAnnualIncomeGbp).toBe(65000);
      expect(res.lowMultiple).toBe(4);
      expect(res.highMultiple).toBe(4.5);
      expect(res.lowLoanGbp).toBe(260000);
      expect(res.highLoanGbp).toBe(292500);
      expect(res.netDepositGbp).toBeNull();
      expect(res.lowPropertyPriceGbp).toBeNull();
      expect(res.highPropertyPriceGbp).toBeNull();
      expect(res.lowLtvPct).toBeNull();
      expect(res.highLtvPct).toBeNull();
    });

    it("computes property price and LTV when deposit and buying costs are given", () => {
      // Combined income £50,000 -> loans £200,000 (4x) and £225,000 (4.5x)
      // Deposit £55,000, buying costs £5,000 -> net deposit £50,000
      // Low price: 200000 + 50000 = 250000; LTV: 200000 / 250000 = 80.0%
      // High price: 225000 + 50000 = 275000; LTV: 225000 / 275000 = 81.818... -> 81.8%
      const res = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 50000,
        depositGbp: 55000,
        buyingCostsGbp: 5000,
      });
      expect(res.netDepositGbp).toBe(50000);
      expect(res.lowPropertyPriceGbp).toBe(250000);
      expect(res.highPropertyPriceGbp).toBe(275000);
      expect(res.lowLtvPct).toBe(80);
      expect(res.highLtvPct).toBe(81.8);
    });

    it("normalises reversed multiples and floors net deposit at 0 when buying costs exceed it", () => {
      const res = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 40000,
        lowMultiple: 4.5,
        highMultiple: 3.5,
        depositGbp: 4000,
        buyingCostsGbp: 6000,
      });
      expect(res.lowMultiple).toBe(3.5);
      expect(res.highMultiple).toBe(4.5);
      expect(res.lowLoanGbp).toBe(140000);
      expect(res.highLoanGbp).toBe(180000);
      expect(res.netDepositGbp).toBe(0);
      expect(res.lowPropertyPriceGbp).toBeNull();
      expect(res.lowLtvPct).toBeNull();
    });

    it("handles negative, NaN, zero deposit, and negative multiple inputs safely", () => {
      const res = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: -10000,
        secondAnnualIncomeGbp: Number.NaN,
        lowMultiple: -2,
        highMultiple: Number.NaN,
        depositGbp: 0,
        buyingCostsGbp: -500,
      });
      expect(res.primaryAnnualIncomeGbp).toBe(0);
      expect(res.secondAnnualIncomeGbp).toBe(0);
      expect(res.lowMultiple).toBe(0);
      expect(res.highMultiple).toBe(4.5);
      expect(res.lowLoanGbp).toBe(0);
      expect(res.highLoanGbp).toBe(0);
      expect(res.netDepositGbp).toBeNull();
    });
  });

  describe("calculateBudgetLoanEstimate", () => {
    it("computes single loan, property price, and LTV from a user-chosen rate", () => {
      // £1,000/month at 4.5% over 300 months -> loan £179,910.32 (case 3)
      // Deposit £35,000 - £5,000 buying costs = £30,000 net deposit
      // Price: 179910.32 + 30000 = £209,910.32
      // LTV: 179910.32 / 209910.32 = 85.708... -> 85.7%
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        annualRatePct: 4.5,
        depositGbp: 35000,
        buyingCostsGbp: 5000,
      });
      expect(res.loanGbp).toBe(179910.32);
      expect(res.lowLoanGbp).toBe(179910.32);
      expect(res.highLoanGbp).toBe(179910.32);
      expect(res.netDepositGbp).toBe(30000);
      expect(res.propertyPriceGbp).toBe(209910.32);
      expect(res.ltvPct).toBe(85.7);
      expect(res.matchedRateBand).toBeNull();
    });

    it("resolves LTV default rate band from deposit when no rate is typed", () => {
      // £1,000/month over 300 months with £50,000 net deposit:
      // At 70% band (4.32%-4.61%): highLoan at 4.32% = 183,240.38 -> LTV = 183240.38 / 233240.38 = 78.6% (> 70%)
      // At 80% band (4.41%-4.77%): highLoan at 4.41% = 181,575.06 -> LTV = 181575.06 / 231575.06 = 78.4% (<= 80%)
      // So 80% band matches: lowLoan at 4.77% = 175,049.10, highLoan at 4.41% = 181,575.06.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        depositGbp: 50000,
      });
      expect(res.matchedRateBand).toEqual({
        maxLtvPct: 80,
        lowAnnualRatePct: 4.41,
        highAnnualRatePct: 4.77,
      });
      expect(res.loanGbp).toBeNull();
      expect(res.lowAnnualRatePct).toBe(4.41);
      expect(res.highAnnualRatePct).toBe(4.77);
      expect(res.lowLoanGbp).toBe(175049.1);
      expect(res.highLoanGbp).toBe(181575.06);
      expect(res.lowPropertyPriceGbp).toBe(225049.1);
      expect(res.highPropertyPriceGbp).toBe(231575.06);
      expect(res.lowLtvPct).toBe(77.8);
      expect(res.highLtvPct).toBe(78.4);
    });

    it("returns null loan when no rate is given and deposit is missing or LTV exceeds 90%", () => {
      // No deposit and no rate -> empty rate (MA5)
      const noDeposit = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
      });
      expect(noDeposit.loanGbp).toBeNull();
      expect(noDeposit.lowLoanGbp).toBeNull();
      expect(noDeposit.matchedRateBand).toBeNull();

      // Tiny deposit (£5,000) -> LTV > 90% -> no default band
      const over90 = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        depositGbp: 5000,
      });
      expect(over90.matchedRateBand).toBeNull();
      expect(over90.lowLoanGbp).toBeNull();
    });

    it("supports an explicit rateBand and 0% single rate", () => {
      const bandRes = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 900,
        termMonths: 300,
        rateBand: { lowAnnualRatePct: 4, highAnnualRatePct: 5 },
      });
      // At 5%: 900 * ((1.0041666667^300 - 1) / (0.0041666667 * 1.0041666667^300)) = £153,954.04
      // At 4%: 900 * ((1.0033333333^300 - 1) / (0.0033333333 * 1.0033333333^300)) = £170,507.23
      expect(bandRes.lowLoanGbp).toBe(153954.04);
      expect(bandRes.highLoanGbp).toBe(170507.23);

      const zeroRes = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 900,
        termMonths: 300,
        annualRatePct: 0,
      });
      expect(zeroRes.loanGbp).toBe(270000);
    });

    it("handles invalid payment, term, negative rate, and 60% / 90% LTV band edges", () => {
      const badPayment = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: -100,
        termMonths: 300,
        annualRatePct: 4,
      });
      expect(badPayment.loanGbp).toBeNull();
      expect(badPayment.monthlyPaymentGbp).toBe(0);

      const badTerm = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: Number.POSITIVE_INFINITY,
        annualRatePct: 4,
        depositGbp: 0,
      });
      expect(badTerm.loanGbp).toBeNull();
      expect(badTerm.termMonths).toBe(0);
      expect(badTerm.netDepositGbp).toBeNull();

      const zeroRateBand = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 120,
        rateBand: { lowAnnualRatePct: 5, highAnnualRatePct: 0 },
      });
      expect(zeroRateBand.lowAnnualRatePct).toBe(0);
      expect(zeroRateBand.highAnnualRatePct).toBe(5);
      expect(zeroRateBand.highLoanGbp).toBe(120000);

      const badRate = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        annualRatePct: -1,
        rateBand: { lowAnnualRatePct: -1, highAnnualRatePct: 5 },
      });
      expect(badRate.loanGbp).toBeNull();

      // Large deposit -> <= 60% band (4.24% - 4.44%)
      const lowLtv = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        depositGbp: 200000,
      });
      expect(lowLtv.matchedRateBand?.maxLtvPct).toBe(60);

      // Smaller deposit -> 90% band (4.49% - 4.94%)
      const highLtv = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        depositGbp: 25000,
      });
      expect(highLtv.matchedRateBand?.maxLtvPct).toBe(90);
    });
  });
});
