import { describe, expect, it } from "vitest";
import {
  calculateBudgetLoanEstimate,
  calculateIncomeMultipleRange,
  DEFAULT_ESTIMATE_TERM_MONTHS,
  DEFAULT_INCOME_MULTIPLE_HIGH,
  DEFAULT_INCOME_MULTIPLE_LOW,
  resolveEstimateTermMonths,
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

    it("counts a loan to value exactly on a band's limit as inside that band", () => {
      // £1,001 a month over 300 months at the 80% band's 4.41%: i = 0.003675,
      // (1.003675)^-300 = 0.332700, loan = 1001 x 0.667300 / 0.003675 = £181,756.64.
      // Deposit £45,439.16 = 181,756.64 / 4, so price = £227,195.80 and LTV = 4/5 = 80% exactly.
      // The 60% and 70% bands' lower rates give a bigger loan, so LTV above 80%: no fit.
      // 80% <= 80% picks the 80% band; a strict < would wrongly move it to the 90% band.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1001,
        termMonths: 300,
        depositGbp: 45439.16,
      });
      expect(res.matchedRateBand?.maxLtvPct).toBe(80);
      expect(res.highLtvPct).toBe(80);
    });

    it("shows no property price or loan to value without a deposit", () => {
      // E39 worked case 3: £1,000 at 4.5% over 300 months = £179,910.32. No deposit, so the
      // property price and LTV are unknown, not the loan alone or 100%.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        annualRatePct: 4.5,
      });
      expect(res.loanGbp).toBeCloseTo(179910.32, 2);
      expect(res.propertyPriceGbp).toBeNull();
      expect(res.lowPropertyPriceGbp).toBeNull();
      expect(res.highPropertyPriceGbp).toBeNull();
      expect(res.lowLtvPct).toBeNull();
      expect(res.highLtvPct).toBeNull();
    });

    it("treats a deposit used up by buying costs as no deposit", () => {
      // £5,000 deposit less £6,000 buying costs: net deposit max(0, -1000) = £0.
      // £0 is not a deposit, so no property price (not £179,910.32 at 100% LTV).
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        annualRatePct: 4.5,
        depositGbp: 5000,
        buyingCostsGbp: 6000,
      });
      expect(res.netDepositGbp).toBe(0);
      expect(res.propertyPriceGbp).toBeNull();
      expect(res.ltvPct).toBeNull();
    });

    it("reads a negative term as no term", () => {
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: -12,
        annualRatePct: 4.5,
      });
      expect(res.termMonths).toBe(0);
      expect(res.loanGbp).toBeNull();
    });

    it("accepts a 0% band edge and ignores a band with a negative rate", () => {
      // Band 0% to 4.5%: at 0% the loan is payment x n = £1,000 x 300 = £300,000 (high loan);
      // at 4.5% it is £179,910.32 (low loan).
      const zeroLow = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        rateBand: { lowAnnualRatePct: 0, highAnnualRatePct: 4.5 },
      });
      expect(zeroLow.highLoanGbp).toBe(300000);
      expect(zeroLow.lowLoanGbp).toBeCloseTo(179910.32, 2);

      for (const rateBand of [
        { lowAnnualRatePct: -1, highAnnualRatePct: 4.5 },
        { lowAnnualRatePct: 4.5, highAnnualRatePct: -1 },
      ]) {
        const bad = calculateBudgetLoanEstimate({
          monthlyPaymentGbp: 1000,
          termMonths: 300,
          rateBand,
        });
        expect(bad.lowAnnualRatePct).toBeNull();
        expect(bad.lowLoanGbp).toBeNull();
        expect(bad.highLoanGbp).toBeNull();
      }
    });

    it("gives a single loan when a band's two rates are equal", () => {
      // 4.5% to 4.5% is one rate: loan £179,910.32, not a range.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        rateBand: { lowAnnualRatePct: 4.5, highAnnualRatePct: 4.5 },
      });
      expect(res.loanGbp).toBeCloseTo(179910.32, 2);
    });

    it("keeps the matched band when its loan lands just inside a lower band's LTV", () => {
      // £1,000 a month, 300 months, £45,030 deposit. Loan = 1000 * (1 - (1 + i)^-300) / i.
      // 70% band at 4.32%: i = 0.0036, (1.0036)^-300 = 0.34023,
      //   loan = 659.75 / 0.0036 = £183,262.57, LTV = 183262.57 / 228292.57 = 80.27% > 70, no fit.
      // 80% band at 4.41%: i = 0.003675, (1.003675)^-300 = 0.33270,
      //   loan = 667.30 / 0.003675 = £181,578, LTV = 181578 / 226608 = 80.13% > 80, no fit.
      // 90% band at 4.49%: i = 0.0037417, (1.0037417)^-300 = 0.32614,
      //   loan = 673.86 / 0.0037417 = £180,096, LTV = 180096 / 225126 = 79.998% <= 90, fits.
      // The matched band is the 90% band (4.49% to 4.94%). Looking the band up again from
      // 79.998% would wrongly give the 80% band, whose 4.41% rate yields 80.13% LTV.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1000,
        termMonths: 300,
        depositGbp: 45030,
      });
      expect(res.matchedRateBand).toEqual({
        maxLtvPct: 90,
        lowAnnualRatePct: 4.49,
        highAnnualRatePct: 4.94,
      });
      expect(res.lowAnnualRatePct).toBe(4.49);
      expect(res.highAnnualRatePct).toBe(4.94);
      // High LTV uses the higher loan at 4.49%: 79.998%, within the 90% band and not 80.13%.
      expect(res.highLtvPct).toBeLessThanOrEqual(80);
      expect(res.highLtvPct).toBeGreaterThan(79.9);
    });
  });

  describe("with the property transaction tax taken off the deposit (E39 S1c)", () => {
    it("income view: solves each end of the range after SDLT", () => {
      // £50,000 x 4 = £200,000; x 4.5 = £225,000. Deposit £27,500, England, not a first-time buyer.
      // High: B = 252,500. tax(250,000) = 2% x 125,000 = £2,500 -> 252,500 = B; 250,000.01 does
      // not fit (5% of 1p rounds to £0, so cost 252,500.01). LTV 225,000 / 250,000 = 90.0%.
      // Low: B = 227,500. P = 225,491: 2% x 100,491 = 2,009.82, floored £2,009 -> 227,500 = B.
      // P = 225,491.01: 2,009.8202 -> £2,009 -> 227,500.01 > B. LTV 200,000 / 225,491 = 88.695 -> 88.7%.
      const res = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 50_000,
        depositGbp: 27_500,
        propertyTax: { jurisdiction: "ENGLAND_NI", isFirstTimeBuyer: false },
      });
      expect(res.netDepositGbp).toBe(27_500);
      expect(res.highPropertyPriceGbp).toBe(250_000);
      expect(res.highLtvPct).toBe(90);
      expect(res.lowPropertyPriceGbp).toBe(225_491);
      expect(res.lowLtvPct).toBe(88.7);
      expect(res.highPriceSolution).toMatchObject({ status: "solved" });
      if (res.highPriceSolution?.status !== "solved" || res.lowPriceSolution?.status !== "solved") {
        throw new Error("expected both ends solved");
      }
      expect(res.highPriceSolution.propertyTax.taxGbp).toBe(2_500);
      expect(res.lowPriceSolution.propertyTax.taxGbp).toBe(2_009);
    });

    it("income view: other buying costs and tax both come off; a short deposit gives no price", () => {
      // £60,000 x 4 = £240,000; x 4.5 = £270,000. Deposit £12,000 less £2,000 costs, Wales.
      // Low: B = 250,000. 1.06P = 250,000 + 13,500 -> P = 248,584.9057. P = 248,584.90:
      // 6% x 23,584.90 = 1,415.094 -> £1,415.09 -> 249,999.99. P = 248,584.91: 1,415.0946 ->
      // £1,415.09 -> 250,000.00 = B. P = 248,584.92: 1,415.0952 -> £1,415.10 -> 250,000.02 > B.
      // High: tax at a £270,000 price = 6% x 45,000 = £2,700; costs + tax = 4,700 < 12,000, so it
      // solves too: B = 280,000, 1.06P = 280,000 + 13,500 -> P = 276,886.79: 6% x 51,886.79 =
      // 3,113.2074 -> £3,113.21 -> 280,000.00 = B; P = 276,886.80: 3,113.208 -> £3,113.21 -> over.
      const res = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 60_000,
        depositGbp: 12_000,
        buyingCostsGbp: 2_000,
        propertyTax: { jurisdiction: "WALES" },
      });
      expect(res.netDepositGbp).toBe(10_000);
      expect(res.lowPropertyPriceGbp).toBe(248_584.91);
      expect(res.highPropertyPriceGbp).toBe(276_886.79);

      // Deposit £5,000 less £3,000 costs, Wales. High: tax at a £270,000 price = £2,700;
      // 3,000 + 2,700 = 5,700 > 5,000, short by £700.
      // Low: tax at £240,000 = 6% x 15,000 = £900; 3,000 + 900 = 3,900 <= 5,000 fits.
      const short = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 60_000,
        depositGbp: 5_000,
        buyingCostsGbp: 3_000,
        propertyTax: { jurisdiction: "WALES" },
      });
      expect(short.highPropertyPriceGbp).toBeNull();
      expect(short.highLtvPct).toBeNull();
      expect(short.highPriceSolution).toMatchObject({
        status: "deposit-short",
        shortfallGbp: 700,
      });
      expect(short.lowPriceSolution).toMatchObject({ status: "solved" });
      expect(short.lowPropertyPriceGbp).not.toBeNull();
    });

    it("income view: no tax answers or no deposit leaves the solutions empty", () => {
      // Without tax answers: price = loan + net deposit = 200,000 + 27,500 = 227,500.
      const plain = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 50_000,
        depositGbp: 27_500,
      });
      expect(plain.lowPropertyPriceGbp).toBe(227_500);
      expect(plain.lowPriceSolution).toBeNull();
      expect(plain.highPriceSolution).toBeNull();
      const noDeposit = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 50_000,
        propertyTax: { jurisdiction: "SCOTLAND" },
      });
      expect(noDeposit.lowPriceSolution).toBeNull();
      const costsTakeAll = calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: 50_000,
        depositGbp: 1_000,
        buyingCostsGbp: 1_000,
        propertyTax: { jurisdiction: "SCOTLAND" },
      });
      expect(costsTakeAll.netDepositGbp).toBe(0);
      expect(costsTakeAll.highPriceSolution).toBeNull();
    });

    it("budget view: a single rate solves the price after LBTT", () => {
      // 0% over 300 months: £750 x 300 = £225,000 loan. Deposit £27,100, Scotland.
      // B = 252,100. tax(250,000) = 2% x 105,000 = £2,100 -> 252,100 = B; 250,000.01 costs
      // 252,100.01. LTV 225,000 / 250,000 = 90.0%.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 750,
        termMonths: 300,
        annualRatePct: 0,
        depositGbp: 27_100,
        propertyTax: { jurisdiction: "SCOTLAND", isFirstTimeBuyer: false },
      });
      expect(res.loanGbp).toBe(225_000);
      expect(res.propertyPriceGbp).toBe(250_000);
      expect(res.ltvPct).toBe(90);
      expect(res.lowPriceSolution).toMatchObject({ status: "solved", propertyPriceGbp: 250_000 });
    });

    it("budget view: the default rate band is chosen on the loan to value after tax", () => {
      // £1,000 a month over 300 months, deposit £125,000, England, no rate typed.
      // Loans (annuity, checked with a calculator): 4.24% -> 1.0035333^300 = 2.880984,
      // £184,781.98; 4.32% -> 2.938974, £183,262.57; 4.61% -> 3.159115, £177,906.02.
      // Without tax, the 60% band: price 184,781.98 + 125,000 = 309,781.98, LTV 59.65% -> fits.
      // With SDLT, the 60% band: B = 309,781.98, P = 304,554.98 (2,500 + 5% x 54,554.98 =
      // 5,227.749 -> 5,227.75, floored £5,227 -> = B). LTV 184,781.98 / 304,554.98 = 60.67% > 60.
      // The 70% band (4.32% to 4.61%): high loan B = 308,262.57, P = 303,107.57 (5% x 53,107.57 =
      // 2,655.3785 -> 2,655.38; total 5,155.38 -> £5,155 -> = B; 1p more costs B + 1p).
      // LTV 183,262.57 / 303,107.57 = 60.46% -> fits. Low loan B = 302,906.02, P = 298,006.02
      // (5% x 48,006.02 = 2,400.301 -> 2,400.30; total 4,900.30 -> £4,900 -> = B).
      // LTV 177,906.02 / 298,006.02 = 59.698% -> 59.7%.
      const base = { monthlyPaymentGbp: 1_000, termMonths: 300, depositGbp: 125_000 };
      const plain = calculateBudgetLoanEstimate(base);
      expect(plain.matchedRateBand?.maxLtvPct).toBe(60);

      const res = calculateBudgetLoanEstimate({
        ...base,
        propertyTax: { jurisdiction: "ENGLAND_NI" },
      });
      expect(res.matchedRateBand?.maxLtvPct).toBe(70);
      expect(res.lowAnnualRatePct).toBe(4.32);
      expect(res.highAnnualRatePct).toBe(4.61);
      expect(res.highLoanGbp).toBe(183_262.57);
      expect(res.lowLoanGbp).toBe(177_906.02);
      expect(res.highPropertyPriceGbp).toBe(303_107.57);
      expect(res.lowPropertyPriceGbp).toBe(298_006.02);
      expect(res.highLtvPct).toBe(60.5);
      expect(res.lowLtvPct).toBe(59.7);
      expect(res.propertyPriceGbp).toBeNull();
      expect(res.loanGbp).toBeNull();
    });

    it("budget view: a band whose price the deposit cannot reach does not fit", () => {
      // £1,000 a month over 300 months, deposit £1,000, England. Each band's high loan is between
      // £180,000 and £184,781.98, so SDLT at a price equal to the loan is at least
      // 2% x (180,000 - 125,000) = £1,100 > £1,000: every band is short, so none fits and there is
      // no rate, no loan and no solution.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1_000,
        termMonths: 300,
        depositGbp: 1_000,
        propertyTax: { jurisdiction: "ENGLAND_NI" },
      });
      expect(res.matchedRateBand).toBeNull();
      expect(res.lowLoanGbp).toBeNull();
      expect(res.lowPriceSolution).toBeNull();
    });

    it("budget view: a short deposit at a typed rate gives the shortfall and no price", () => {
      // 0% over 300 months: £1,000 x 300 = £300,000. Deposit £4,000, England.
      // tax(300,000) = 2,500 + 5% x 50,000 = £5,000 > 4,000: short by £1,000.
      const res = calculateBudgetLoanEstimate({
        monthlyPaymentGbp: 1_000,
        termMonths: 300,
        annualRatePct: 0,
        depositGbp: 4_000,
        propertyTax: { jurisdiction: "ENGLAND_NI" },
      });
      expect(res.loanGbp).toBe(300_000);
      expect(res.propertyPriceGbp).toBeNull();
      expect(res.ltvPct).toBeNull();
      expect(res.lowPriceSolution).toMatchObject({ status: "deposit-short", shortfallGbp: 1_000 });
    });
  });

  describe("resolveEstimateTermMonths", () => {
    it("uses the saved month count as saved, not rounded to whole years", () => {
      // 235 months is 19 years 7 months; rounding to years would give 20 x 12 = 240.
      expect(resolveEstimateTermMonths({ remainingTermMonths: 235, remainingTermYears: 30 })).toBe(
        235,
      );
      // A non-finite month count is not a saved term: fall back to 20 years x 12 = 240.
      expect(
        resolveEstimateTermMonths({
          remainingTermMonths: Number.POSITIVE_INFINITY,
          remainingTermYears: 20,
        }),
      ).toBe(240);
    });

    it("falls back to the saved years times 12 when no month count is saved", () => {
      // 18 years x 12 = 216 months; 0 months counts as not saved.
      expect(resolveEstimateTermMonths({ remainingTermMonths: 0, remainingTermYears: 18 })).toBe(
        216,
      );
      // 17.5 years x 12 = 210 months.
      expect(resolveEstimateTermMonths({ remainingTermYears: 17.5 })).toBe(210);
    });

    it("assumes 25 years (300 months) when no term is saved", () => {
      expect(DEFAULT_ESTIMATE_TERM_MONTHS).toBe(300);
      expect(resolveEstimateTermMonths(null)).toBe(300);
      expect(
        resolveEstimateTermMonths({ remainingTermMonths: -5, remainingTermYears: Number.NaN }),
      ).toBe(300);
      // 1 month is the smallest positive term and is kept.
      expect(resolveEstimateTermMonths({ remainingTermMonths: 1 })).toBe(1);
      // Infinite years is not a saved term either.
      expect(resolveEstimateTermMonths({ remainingTermYears: Number.POSITIVE_INFINITY })).toBe(300);
    });
  });
});
