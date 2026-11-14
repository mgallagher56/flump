import type {
  LtvMilestone,
  MortgageAmortizationResult,
  MortgageCalculationInput,
  MortgageVsIsaResult,
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
 * One month of a repayment loan: interest is added at a twelfth of the yearly rate, then the
 * payment comes off. The balance never goes below zero. Shared by the mortgage amortisation and
 * the check-in's calculated balance, so there is one calculation.
 */
export function amortiseOneMonth(
  balanceGbp: number,
  monthlyRate: number,
  paymentGbp: number,
): { balanceGbp: number; interestGbp: number } {
  const interestGbp = balanceGbp * monthlyRate;
  return { balanceGbp: Math.max(0, balanceGbp + interestGbp - paymentGbp), interestGbp };
}

export interface AmortisedBalanceInput {
  /** The balance owed at the start, as a positive amount. */
  balanceGbp: number;
  /** Yearly interest rate in percent, for example 4.5. */
  interestRateApr: number;
  /** The regular monthly payment. */
  monthlyPaymentGbp: number;
  /** Whole months of payments since `balanceGbp` was known. */
  months: number;
}

/**
 * The balance owed after `months` regular payments (check-in calculated balances, R2-5). Returns
 * the balance rounded to the penny. Months of zero or less return the starting balance.
 */
export function projectAmortisedBalance(input: AmortisedBalanceInput): number {
  const monthlyRate = Math.max(0, input.interestRateApr) / 100 / 12;
  const payment = Math.max(0, input.monthlyPaymentGbp);
  let balance = Math.max(0, input.balanceGbp);
  const months = Math.max(0, Math.trunc(input.months));
  for (let m = 0; m < months && balance > 0; m++) {
    balance = amortiseOneMonth(balance, monthlyRate, payment).balanceGbp;
  }
  return Math.round(balance * 100) / 100;
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
  // An unknown property value (0) has no LTV: never report bands as achieved.
  if (!(propertyValueGbp > 0)) return [];
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
    const step = amortiseOneMonth(simBalance, monthlyRate, standardMonthlyPayment);
    standardTotalInterest += step.interestGbp;
    simBalance = step.balanceGbp;
    if (simBalance <= 0) break;
  }

  // Simulate amortization with overpayment
  let overpaidBalance = balance;
  let overpayTotalInterest = 0;
  let monthsWithOverpayment = 0;
  const totalPaymentEachMonth = standardMonthlyPayment + overpayment;

  while (overpaidBalance > 0.01 && monthsWithOverpayment < termMonths) {
    monthsWithOverpayment++;
    const step = amortiseOneMonth(overpaidBalance, monthlyRate, totalPaymentEachMonth);
    overpayTotalInterest += step.interestGbp;
    overpaidBalance = step.balanceGbp;
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

/**
 * Calculates Mortgage Overpayment vs ISA Wealth Accumulation Comparison.
 */
export function calculateMortgageVsIsa(
  mortgageBalance: number,
  interestRate: number,
  remainingYears: number,
  monthlyOverpay: number,
  expectedIsaReturn: number,
): MortgageVsIsaResult {
  const months = Math.max(1, remainingYears * 12);
  const monthlyRate = interestRate / 100 / 12;
  const monthlyIsaRate = expectedIsaReturn / 100 / 12;

  const standardPayment =
    monthlyRate > 0
      ? (mortgageBalance * monthlyRate * (1 + monthlyRate) ** months) /
        ((1 + monthlyRate) ** months - 1)
      : mortgageBalance / months;

  let bal = mortgageBalance;
  let totalInterestOverpay = 0;
  let monthsToZero = 0;
  for (let m = 1; m <= months; m++) {
    if (bal <= 0) break;
    const interest = bal * monthlyRate;
    totalInterestOverpay += interest;
    const principal = Math.min(bal, standardPayment + monthlyOverpay - interest);
    bal -= principal;
    monthsToZero = m;
  }

  let standardBal = mortgageBalance;
  let totalStandardInterest = 0;
  for (let m = 1; m <= months; m++) {
    if (standardBal <= 0) break;
    const interest = standardBal * monthlyRate;
    totalStandardInterest += interest;
    const principal = Math.min(standardBal, standardPayment - interest);
    standardBal -= principal;
  }

  const interestSaved = Math.max(0, totalStandardInterest - totalInterestOverpay);
  const monthsShaved = Math.max(0, months - monthsToZero);
  const yearsShaved = (monthsShaved / 12).toFixed(1);

  let isaPot = 0;
  for (let m = 1; m <= months; m++) {
    isaPot = (isaPot + monthlyOverpay) * (1 + monthlyIsaRate);
  }
  const totalIsaContributed = monthlyOverpay * months;
  const isaGrowth = Math.max(0, isaPot - totalIsaContributed);
  const netWealthDelta = isaPot - (totalIsaContributed + interestSaved);

  return {
    standardPayment: Math.round(standardPayment * 100) / 100,
    interestSaved: Math.round(interestSaved * 100) / 100,
    monthsShaved,
    yearsShaved,
    totalStandardInterest: Math.round(totalStandardInterest * 100) / 100,
    totalInterestOverpay: Math.round(totalInterestOverpay * 100) / 100,
    isaAccumulatedValue: Math.round(isaPot * 100) / 100,
    totalIsaContributed: Math.round(totalIsaContributed * 100) / 100,
    isaGrowth: Math.round(isaGrowth * 100) / 100,
    netWealthDelta: Math.round(netWealthDelta * 100) / 100,
  };
}
