import { describe, expect, it } from "vitest";
import {
  calculateLtvMilestones,
  calculateMonthlyMortgagePayment,
  calculateMortgageAmortization,
  calculateMortgageCostSummary,
  calculateMortgagePayment,
  calculateMortgageVsIsa,
  compareMortgageOverpayVsSave,
  simulateMortgageOverpayment,
} from "./mortgage.js";

/*
 * Small worked cases, every figure worked by hand.
 *
 * Most cases use 12% a year, so the monthly rate is 12 / 100 / 12 = 1%, and a 3-month term on a
 * loan of 30,301. The annuity formula M = P r (1+r)^n / ((1+r)^n - 1) with r = 0.01, n = 3:
 * (1.01)^3 = 1.030301, so M = 30,301 x 0.01 x 1.030301 / 0.030301. As 30,301 / 0.030301 =
 * 1,000,000, M = 1,000,000 x 0.01030301 = 10,303.01.
 *
 * The standard schedule at that payment (interest is 1% of the balance at the start of the month):
 *   month 1: interest 303.01, balance 30,301 + 303.01 - 10,303.01 = 20,301
 *   month 2: interest 203.01, balance 20,301 + 203.01 - 10,303.01 = 10,201
 *   month 3: interest 102.01, balance 10,201 + 102.01 - 10,303.01 = 0
 *   total interest 303.01 + 203.01 + 102.01 = 608.03
 *
 * With 5,100 a month on top (15,403.01 a month in all):
 *   month 1: interest 303.01, balance 30,301 + 303.01 - 15,403.01 = 15,201
 *   month 2: interest 152.01, balance 15,201 + 152.01 - 15,403.01 = -50, so 0 (cleared)
 *   total interest 303.01 + 152.01 = 455.02, saving 608.03 - 455.02 = 153.01, one month early
 */
const LOAN = 30301;
const RATE = 12;
const OVERPAY = 5100;

/** (1.01)^12 = 1.12682503013197 to 15 places, so this yearly rate compounds at exactly 1% a month. */
const ONE_PERCENT_MONTHLY_AS_ANNUAL_PCT = 12.682503013196971;

describe("repayment formula guards", () => {
  it("returns 0, not a negative payment, for a negative principal", () => {
    // A negative loan is bad input; at 0% the bare formula would give -1,200 / 12 = -100.
    expect(calculateMonthlyMortgagePayment(-1200, 0, 12)).toBe(0);
    expect(calculateMortgagePayment(-1200, 0, 1)).toBe(0);
  });

  it("returns 0, not Infinity, for a zero term at 0%", () => {
    // 1,200 / 0 months would be Infinity.
    expect(calculateMonthlyMortgagePayment(1200, 0, 0)).toBe(0);
    expect(calculateMortgagePayment(1200, 0, 0)).toBe(0);
  });

  it("returns 0 for a negative term at 0%", () => {
    // 1,200 / -12 would be a payment of -100.
    expect(calculateMonthlyMortgagePayment(1200, 0, -12)).toBe(0);
  });

  it("works out the 3-month annuity worked in the header", () => {
    expect(calculateMonthlyMortgagePayment(LOAN, RATE, 3)).toBe(10303.01);
  });
});

describe("calculateMortgagePayment, interest-only", () => {
  it("charges a twelfth of the yearly interest on the balance", () => {
    // 1,200 x 12% / 12 = 12 a month.
    expect(calculateMortgagePayment(1200, 12, 25, "interest-only")).toBeCloseTo(12, 10);
  });

  it("returns 0 for a negative balance rather than a negative payment", () => {
    // -1,200 x 12% / 12 would be -12.
    expect(calculateMortgagePayment(-1200, 12, 25, "interest-only")).toBe(0);
  });
});

describe("calculateLtvMilestones, worked", () => {
  const REF = new Date("2026-01-01T00:00:00Z");

  it("spreads each lump sum over the whole months left on the fix", () => {
    // 1 Jan 2026 to 1 Nov 2026 is 31+28+31+30+31+30+31+31+30+31 = 304 days.
    // 304 / 30.4375 days a month = 9.99 months, which rounds to 10.
    // Balance 90,000 on a 100,000 home is 90% LTV, so no band is reached yet.
    const m = calculateLtvMilestones(100000, 90000, "2026-11-01", REF);
    expect(m).toEqual([
      // 85% of 100,000 = 85,000; 90,000 - 85,000 = 5,000; 5,000 / 10 = 500 a month
      {
        targetLtvPct: 85,
        targetBalanceGbp: 85000,
        lumpSumNeededGbp: 5000,
        requiredMonthlyOverpaymentBeforeFixGbp: 500,
        isAchieved: false,
      },
      // 80,000 target; 10,000 / 10 = 1,000
      {
        targetLtvPct: 80,
        targetBalanceGbp: 80000,
        lumpSumNeededGbp: 10000,
        requiredMonthlyOverpaymentBeforeFixGbp: 1000,
        isAchieved: false,
      },
      // 75,000 target; 15,000 / 10 = 1,500
      {
        targetLtvPct: 75,
        targetBalanceGbp: 75000,
        lumpSumNeededGbp: 15000,
        requiredMonthlyOverpaymentBeforeFixGbp: 1500,
        isAchieved: false,
      },
      // 60,000 target; 30,000 / 10 = 3,000
      {
        targetLtvPct: 60,
        targetBalanceGbp: 60000,
        lumpSumNeededGbp: 30000,
        requiredMonthlyOverpaymentBeforeFixGbp: 3000,
        isAchieved: false,
      },
    ]);
  });

  it("counts an LTV exactly on a band as reached, and needs no overpayment for it", () => {
    // 80,000 / 100,000 = 80% exactly: the 85% and 80% bands are reached, 75% and 60% are not.
    // A fix that ended before the reference date still counts as at least one month, so a band
    // not yet reached needs its whole lump sum in that month.
    const m = calculateLtvMilestones(100000, 80000, "2025-06-01", REF);
    expect(m.map((b) => b.isAchieved)).toEqual([true, true, false, false]);
    expect(m.map((b) => b.lumpSumNeededGbp)).toEqual([0, 0, 5000, 20000]);
    // Reached bands have nothing to pay; 75%: 5,000 / 1; 60%: 20,000 / 1.
    expect(m.map((b) => b.requiredMonthlyOverpaymentBeforeFixGbp)).toEqual([
      undefined,
      undefined,
      5000,
      20000,
    ]);
  });

  it("gives no monthly figure when there is no fix end date", () => {
    // 85,000 / 100,000 = 85%: the 80% band needs 5,000 but there is no date to spread it over.
    const m = calculateLtvMilestones(100000, 85000, undefined, REF);
    expect(m.map((b) => b.lumpSumNeededGbp)).toEqual([0, 5000, 10000, 25000]);
    expect(m.every((b) => b.requiredMonthlyOverpaymentBeforeFixGbp === undefined)).toBe(true);
  });
});

describe("calculateMortgageAmortization, worked", () => {
  const REF = new Date("2026-01-15T12:00:00Z");

  it("works out every figure of a 3-month loan paid off a month early", () => {
    const res = calculateMortgageAmortization(
      {
        propertyValueGbp: 60602,
        currentBalanceGbp: LOAN,
        interestRateApr: RATE,
        remainingTermMonths: 3,
        monthlyOverpaymentGbp: OVERPAY,
        afterTaxIsaExpectedReturnApr: ONE_PERCENT_MONTHLY_AS_ANNUAL_PCT,
      },
      REF,
    );
    expect(res.monthlyPaymentGbp).toBe(10303.01);
    expect(res.totalInterestStandardGbp).toBe(608.03);
    expect(res.totalInterestWithOverpaymentGbp).toBe(455.02);
    expect(res.interestSavedGbp).toBe(153.01);
    // Cleared in month 2 of 3.
    expect(res.newTermMonths).toBe(2);
    expect(res.monthsSaved).toBe(1);
    // 15 January 2026 plus 2 months is 15 March 2026.
    expect(res.payoffDate).toBe("March 2026");
    // 30,301 / 60,602 = 50%.
    expect(res.currentLtvPct).toBe(50);
    // 5,100 for the 2 months the loan runs = 10,200.
    expect(res.overpayVsIsaComparison.overpaymentTotalGbp).toBe(10200);
    expect(res.overpayVsIsaComparison.guaranteedMortgageInterestSavedGbp).toBe(153.01);
    // ISA at 1% a month, paid in at the start of each month:
    // month 1: 5,100 x 1.01 = 5,151; month 2: (5,151 + 5,100) x 1.01 = 10,353.51.
    expect(res.overpayVsIsaComparison.projectedIsaWealthGbp).toBe(10353.51);
    // 10,353.51 - 153.01 - 10,200 = 0.50.
    expect(res.overpayVsIsaComparison.netBenefitOfIsaOverMortgageGbp).toBe(0.5);
  });

  it("reports no LTV when the property value is 0", () => {
    const res = calculateMortgageAmortization(
      {
        propertyValueGbp: 0,
        currentBalanceGbp: 1200,
        interestRateApr: 0,
        remainingTermMonths: 12,
      },
      REF,
    );
    expect(res.currentLtvPct).toBe(0);
  });

  it("treats a nil balance as already paid off", () => {
    // Nothing owed: no months to run, so all 12 are saved and the payoff is this month.
    const res = calculateMortgageAmortization(
      {
        propertyValueGbp: 100000,
        currentBalanceGbp: 0,
        interestRateApr: 5,
        remainingTermMonths: 12,
      },
      REF,
    );
    expect(res.newTermMonths).toBe(0);
    expect(res.monthsSaved).toBe(12);
    expect(res.payoffDate).toBe("January 2026");
  });

  it("treats a balance of 1p or less as already cleared", () => {
    const res = calculateMortgageAmortization(
      {
        propertyValueGbp: 100000,
        currentBalanceGbp: 0.01,
        interestRateApr: 0,
        remainingTermMonths: 1,
      },
      REF,
    );
    expect(res.newTermMonths).toBe(0);
  });

  it("never runs past the remaining term, even when pennies are left from rounding", () => {
    // 1.00 over 7 months at 0%: 1 / 7 = 0.142857, which rounds to 0.14 a month.
    // After 7 payments 1.00 - 7 x 0.14 = 0.02 is still owed, but the term is 7 months.
    const res = calculateMortgageAmortization(
      {
        propertyValueGbp: 100000,
        currentBalanceGbp: 1,
        interestRateApr: 0,
        remainingTermMonths: 7,
      },
      REF,
    );
    expect(res.monthlyPaymentGbp).toBe(0.14);
    expect(res.newTermMonths).toBe(7);
    expect(res.monthsSaved).toBe(0);
  });
});

describe("calculateMortgageVsIsa, worked", () => {
  it("works out every figure of a 3-month loan with an overpayment", () => {
    // 0.25 years = 3 months; the schedules are the ones in the header.
    const res = calculateMortgageVsIsa(LOAN, RATE, 0.25, OVERPAY, 12);
    expect(res.standardPayment).toBe(10303.01);
    expect(res.totalStandardInterest).toBe(608.03);
    expect(res.totalInterestOverpay).toBe(455.02);
    expect(res.interestSaved).toBe(153.01);
    // Cleared in month 2 of 3: 1 month, 1 / 12 = 0.083 years, shown to one place as 0.1.
    expect(res.monthsShaved).toBe(1);
    expect(res.yearsShaved).toBe("0.1");
    // ISA at 12% / 12 = 1% a month, for all 3 months of the term, paid in at the start:
    // 5,100 x 1.01 = 5,151; (5,151 + 5,100) x 1.01 = 10,353.51;
    // (10,353.51 + 5,100) x 1.01 = 15,608.0451, so 15,608.05.
    expect(res.isaAccumulatedValue).toBe(15608.05);
    // 5,100 x 3 = 15,300 paid in; growth 15,608.0451 - 15,300 = 308.0451, so 308.05.
    expect(res.totalIsaContributed).toBe(15300);
    expect(res.isaGrowth).toBe(308.05);
    // 15,608.0451 - (15,300 + 153.01) = 155.0351, so 155.04.
    expect(res.netWealthDelta).toBe(155.04);
  });

  it("saves nothing and shaves no months with no overpayment", () => {
    // Both schedules are the standard one: 608.03 interest, cleared in month 3 of 3.
    const res = calculateMortgageVsIsa(LOAN, RATE, 0.25, 0, 12);
    expect(res.totalStandardInterest).toBe(608.03);
    expect(res.totalInterestOverpay).toBe(608.03);
    expect(res.interestSaved).toBe(0);
    expect(res.monthsShaved).toBe(0);
    expect(res.isaAccumulatedValue).toBe(0);
  });

  it("repays a 0% loan in equal parts", () => {
    // 1,200 over 1 year = 12 months: 100 a month.
    expect(calculateMortgageVsIsa(1200, 0, 1, 0, 0).standardPayment).toBe(100);
  });
});

describe("calculateMortgageCostSummary, worked", () => {
  it("works out the totals of a 3-month repayment loan", () => {
    // 3 payments of 10,303.01 = 30,909.03 in all; interest 30,909.03 - 30,301 = 608.03;
    // share 608.03 / 30,909.03 = 1.96716%. Not rounded by the function, so toBeCloseTo.
    const s = calculateMortgageCostSummary(LOAN, RATE, 0.25, "repayment");
    expect(s?.monthlyPayment).toBeCloseTo(10303.01, 6);
    expect(s?.scheduledTotal).toBeCloseTo(30909.03, 6);
    expect(s?.totalInterest).toBeCloseTo(608.03, 6);
    expect(s?.totalPaid).toBeCloseTo(30909.03, 6);
    expect(s?.interestPercentage).toBeCloseTo(1.96716, 4);
  });

  it("returns null for an interest-only loan with no term", () => {
    // Interest-only has a payment (120,000 x 5% / 12 = 500) even with no term, so the term
    // check is what stops a summary with 0 months.
    expect(calculateMortgageCostSummary(120000, 5, 0, "interest-only")).toBeNull();
  });

  it("returns null when the rate is not a finite number", () => {
    expect(calculateMortgageCostSummary(200000, Number.POSITIVE_INFINITY, 25)).toBeNull();
  });
});

describe("simulateMortgageOverpayment, worked", () => {
  const closeTo = (values: number[] | undefined, expected: number[]) => {
    expect(values).toHaveLength(expected.length);
    expected.forEach((v, idx) => {
      // Floating point: the unrounded payment can leave a balance like 1e-11 instead of 0.
      expect(values?.[idx]).toBeCloseTo(v, 6);
    });
  };

  it("works out both schedules of a 3-month repayment loan", () => {
    const sim = simulateMortgageOverpayment({
      loanAmount: LOAN,
      annualRatePct: RATE,
      termYears: 0.25,
      overpayment: OVERPAY,
    });
    expect(sim?.totalMonths).toBe(3);
    expect(sim?.monthlyScheduled).toBeCloseTo(10303.01, 6);
    closeTo(sim?.standardBalances, [30301, 20301, 10201, 0]);
    closeTo(sim?.overpayBalances, [30301, 15201, 0, 0]);
    expect(sim?.standardTotalInterest).toBeCloseTo(608.03, 6);
    expect(sim?.overpayTotalInterest).toBeCloseTo(455.02, 6);
    expect(sim?.interestSaved).toBeCloseTo(153.01, 6);
    expect(sim?.newTermMonths).toBe(2);
    expect(sim?.monthsSaved).toBe(1);
    // Fully repaid: the whole 30,301.
    expect(sim?.principalReduced).toBeCloseTo(30301, 6);
  });

  it("counts the payoff month once when the loan clears in month 1 of 3", () => {
    // 20,400 on top: month 1 pays 10,303.01 + 20,400 - 303.01 = 30,400 of capital, more than the
    // 30,301 owed, so it clears in month 1. Interest 303.01, saving 608.03 - 303.01 = 305.02.
    const sim = simulateMortgageOverpayment({
      loanAmount: LOAN,
      annualRatePct: RATE,
      termYears: 0.25,
      overpayment: 20400,
    });
    closeTo(sim?.overpayBalances, [30301, 0, 0, 0]);
    expect(sim?.newTermMonths).toBe(1);
    expect(sim?.monthsSaved).toBe(2);
    expect(sim?.overpayTotalInterest).toBeCloseTo(303.01, 6);
    expect(sim?.interestSaved).toBeCloseTo(305.02, 6);
  });

  it("works out an interest-only loan, where overpayments only reduce the capital", () => {
    // 1,200 at 1% a month for 3 months. Standard: 12 interest a month, balance stays 1,200,
    // 36 in all. With 100 a month off the capital:
    //   month 1: interest 12, balance 1,100; month 2: interest 11, balance 1,000;
    //   month 3: interest 10, balance 900. Interest 33, saving 3, capital down 300.
    const sim = simulateMortgageOverpayment({
      loanAmount: 1200,
      annualRatePct: RATE,
      termYears: 0.25,
      overpayment: 100,
      mortgageType: "interest-only",
    });
    expect(sim?.monthlyScheduled).toBeCloseTo(12, 10);
    expect(sim?.standardBalances).toEqual([1200, 1200, 1200, 1200]);
    expect(sim?.overpayBalances).toEqual([1200, 1100, 1000, 900]);
    expect(sim?.standardTotalInterest).toBeCloseTo(36, 10);
    expect(sim?.overpayTotalInterest).toBeCloseTo(33, 10);
    expect(sim?.interestSaved).toBeCloseTo(3, 10);
    // Not cleared, so the term is unchanged.
    expect(sim?.newTermMonths).toBe(3);
    expect(sim?.monthsSaved).toBe(0);
    expect(sim?.principalReduced).toBe(300);
  });

  it("returns null for a 0% rate, which on the mortgage page means not known", () => {
    expect(
      simulateMortgageOverpayment({
        loanAmount: 1200,
        annualRatePct: 0,
        termYears: 1,
        overpayment: 0,
      }),
    ).toBeNull();
  });

  it("returns null for an interest-only loan with no term", () => {
    expect(
      simulateMortgageOverpayment({
        loanAmount: 1200,
        annualRatePct: RATE,
        termYears: 0,
        overpayment: 0,
        mortgageType: "interest-only",
      }),
    ).toBeNull();
  });

  it("returns null when the rate is not a finite number", () => {
    expect(
      simulateMortgageOverpayment({
        loanAmount: 1200,
        annualRatePct: Number.POSITIVE_INFINITY,
        termYears: 1,
        overpayment: 0,
      }),
    ).toBeNull();
  });
});

describe("compareMortgageOverpayVsSave, worked", () => {
  it("credits each overpaid pound with the mortgage interest it avoids", () => {
    // Repayment at 1% a month over 6 months, compared over 3 months. Whatever the payment M is,
    // standard S_m = 1.01 S_(m-1) - M and overpaid O_m = 1.01 O_(m-1) - M - 1,000, so the gap
    // D_m = S_m - O_m = 1.01 D_(m-1) + 1,000: D_1 = 1,000, D_2 = 2,010, D_3 = 3,030.10.
    // Saving at 0% gives 3 x 1,000 = 3,000.
    const res = compareMortgageOverpayVsSave({
      loanAmount: 10000,
      annualRatePct: RATE,
      termYears: 0.5,
      overpayment: 1000,
      netSavingsRatePct: 0,
      horizonYears: 0.25,
    });
    expect(res.debtReduction).toBeCloseTo(3030.1, 6);
    expect(res.totalInvested).toBe(3000);
    // 3,030.10 - 3,000 = 30.10 of interest avoided.
    expect(res.mortgageInterestSaved).toBeCloseTo(30.1, 6);
    expect(res.savingsBalance).toBe(3000);
    expect(res.savingsInterestEarned).toBe(0);
    expect(res.difference).toBeCloseTo(30.1, 6);
    expect(res.isOverpayBetter).toBe(true);
    expect(res.actualHorizon).toBe(0.25);
  });

  it("counts interest saved as debt reduction on an interest-only loan", () => {
    // 1,200 at 1% a month, compared over 3 months. Standard: 12 a month interest, 36 in all,
    // balance stays 1,200. Overpaying 100 a month off the capital: interest 12 + 11 + 10 = 33,
    // balance 900. Capital down 300 plus 3 of interest saved = 303.
    // Saving 100 a month at 12% / 12 = 1%, added at the end of each month:
    // 100; 100 x 1.01 + 100 = 201; 201 x 1.01 + 100 = 303.01.
    const res = compareMortgageOverpayVsSave({
      loanAmount: 1200,
      annualRatePct: RATE,
      termYears: 10,
      overpayment: 100,
      netSavingsRatePct: 12,
      horizonYears: 0.25,
      mortgageType: "interest-only",
    });
    expect(res.debtReduction).toBeCloseTo(303, 6);
    expect(res.mortgageInterestSaved).toBeCloseTo(3, 6);
    expect(res.savingsBalance).toBeCloseTo(303.01, 6);
    expect(res.totalInvested).toBe(300);
    expect(res.savingsInterestEarned).toBeCloseTo(3.01, 6);
    expect(res.difference).toBeCloseTo(0.01, 6);
    expect(res.isOverpayBetter).toBe(false);
  });

  it("does not call overpaying better when the two come out equal", () => {
    // 0% repayment, 1,200 over 12 months = 100 a month. After 3 months the standard balance is
    // 900 and the overpaid one (150 a month) is 750: 150 less owed. Saving 50 a month at 0% is
    // also 150, so neither is better.
    const res = compareMortgageOverpayVsSave({
      loanAmount: 1200,
      annualRatePct: 0,
      termYears: 1,
      overpayment: 50,
      netSavingsRatePct: 0,
      horizonYears: 0.25,
    });
    expect(res.debtReduction).toBe(150);
    expect(res.savingsBalance).toBe(150);
    expect(res.mortgageInterestSaved).toBe(0);
    expect(res.difference).toBe(0);
    expect(res.isOverpayBetter).toBe(false);
  });
});
