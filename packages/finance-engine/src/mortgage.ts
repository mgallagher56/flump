import type {
  LtvMilestone,
  MortgageAmortizationResult,
  MortgageCalculationInput,
} from "./types.js";

/**
 * Standard UK mortgage monthly payment formula:
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyMortgagePayment(
  principalGbp: number,
  annualInterestRatePct: number,
  termMonths: number,
): number {
  if (principalGbp <= 0 || termMonths <= 0) return 0;
  if (annualInterestRatePct <= 0) return Math.round((principalGbp / termMonths) * 100) / 100;

  const monthlyRate = annualInterestRatePct / 100 / 12;
  const payment =
    (principalGbp * (monthlyRate * (1 + monthlyRate) ** termMonths)) /
    ((1 + monthlyRate) ** termMonths - 1);

  return Math.round(payment * 100) / 100;
}

/**
 * Calculates Target LTV milestones (85%, 80%, 75%, 60%) and the required overpayment to reach each band.
 */
export function calculateLtvMilestones(
  propertyValueGbp: number,
  currentBalanceGbp: number,
  mortgageFixExpiryDate?: string,
  referenceDate = new Date(),
): LtvMilestone[] {
  const bands = [85, 80, 75, 60];
  const currentLtv = propertyValueGbp > 0 ? (currentBalanceGbp / propertyValueGbp) * 100 : 0;

  let monthsUntilExpiry: number | undefined;
  if (mortgageFixExpiryDate) {
    const expiry = new Date(mortgageFixExpiryDate);
    const diffMs = expiry.getTime() - referenceDate.getTime();
    monthsUntilExpiry = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
  }

  return bands.map((band) => {
    const targetBalance = Math.round(((propertyValueGbp * band) / 100) * 100) / 100;
    const lumpSumNeeded = Math.max(0, Math.round((currentBalanceGbp - targetBalance) * 100) / 100);
    const isAchieved = currentLtv <= band;

    let requiredMonthly: number | undefined;
    if (monthsUntilExpiry && monthsUntilExpiry > 0 && lumpSumNeeded > 0) {
      requiredMonthly = Math.round((lumpSumNeeded / monthsUntilExpiry) * 100) / 100;
    }

    return {
      targetLtvPct: band,
      targetBalanceGbp: targetBalance,
      lumpSumNeededGbp: lumpSumNeeded,
      requiredMonthlyOverpaymentBeforeFixGbp: requiredMonthly,
      isAchieved,
    };
  });
}

/**
 * Calculates Full Mortgage Amortization & Overpay vs ISA comparison.
 */
export function calculateMortgageAmortization(
  input: MortgageCalculationInput,
  referenceDate = new Date(),
): MortgageAmortizationResult {
  const propertyValue = Math.max(0, input.propertyValueGbp);
  const balance = Math.max(0, input.currentBalanceGbp);
  const rateApr = Math.max(0, input.interestRateApr);
  const termMonths = Math.max(1, input.remainingTermMonths);
  const overpayment = Math.max(0, input.monthlyOverpaymentGbp ?? 0);
  const isaRateApr = input.afterTaxIsaExpectedReturnApr ?? 6.0;

  const currentLtvPct =
    propertyValue > 0 ? Math.round((balance / propertyValue) * 100 * 10) / 10 : 0;
  const standardMonthlyPayment = calculateMonthlyMortgagePayment(balance, rateApr, termMonths);

  // Simulate standard amortization
  const monthlyRate = rateApr / 100 / 12;
  let standardTotalInterest = 0;
  let simBalance = balance;

  for (let m = 1; m <= termMonths; m++) {
    const interest = simBalance * monthlyRate;
    standardTotalInterest += interest;
    const principalPaid = standardMonthlyPayment - interest;
    simBalance = Math.max(0, simBalance - principalPaid);
    if (simBalance <= 0) break;
  }

  // Simulate amortization with overpayment
  let overpaidBalance = balance;
  let overpayTotalInterest = 0;
  let monthsWithOverpayment = 0;
  const totalPaymentEachMonth = standardMonthlyPayment + overpayment;

  while (overpaidBalance > 0.01 && monthsWithOverpayment < termMonths) {
    monthsWithOverpayment++;
    const interest = overpaidBalance * monthlyRate;
    overpayTotalInterest += interest;
    const principalPaid = totalPaymentEachMonth - interest;
    overpaidBalance = Math.max(0, overpaidBalance - principalPaid);
    if (overpaidBalance <= 0.01) break;
  }

  const interestSaved = Math.max(
    0,
    Math.round((standardTotalInterest - overpayTotalInterest) * 100) / 100,
  );
  const monthsSaved = Math.max(0, termMonths - monthsWithOverpayment);

  const payoffDate = new Date(referenceDate);
  payoffDate.setUTCMonth(payoffDate.getUTCMonth() + monthsWithOverpayment);
  const payoffDateFormatted = payoffDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const targetLtvMilestones = calculateLtvMilestones(
    propertyValue,
    balance,
    input.mortgageFixExpiryDate,
    referenceDate,
  );

  // Overpay vs ISA analysis over the duration
  // If the user invests `overpayment` monthly in an ISA at `isaRateApr` instead
  const isaMonthlyRate = (1 + isaRateApr / 100) ** (1 / 12) - 1;
  let accumulatedIsaWealth = 0;
  const totalOverpaidSum = overpayment * monthsWithOverpayment;

  for (let m = 1; m <= monthsWithOverpayment; m++) {
    accumulatedIsaWealth = (accumulatedIsaWealth + overpayment) * (1 + isaMonthlyRate);
  }

  const netBenefitOfIsa =
    Math.round((accumulatedIsaWealth - interestSaved - totalOverpaidSum) * 100) / 100;

  return {
    monthlyPaymentGbp: standardMonthlyPayment,
    totalInterestStandardGbp: Math.round(standardTotalInterest * 100) / 100,
    totalInterestWithOverpaymentGbp: Math.round(overpayTotalInterest * 100) / 100,
    interestSavedGbp: interestSaved,
    monthsSaved,
    newTermMonths: monthsWithOverpayment,
    payoffDate: payoffDateFormatted,
    currentLtvPct,
    targetLtvMilestones,
    overpayVsIsaComparison: {
      overpaymentTotalGbp: Math.round(totalOverpaidSum * 100) / 100,
      guaranteedMortgageInterestSavedGbp: interestSaved,
      projectedIsaWealthGbp: Math.round(accumulatedIsaWealth * 100) / 100,
      netBenefitOfIsaOverMortgageGbp: netBenefitOfIsa,
    },
  };
}
