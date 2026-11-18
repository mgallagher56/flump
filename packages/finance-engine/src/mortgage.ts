import type {
  LtvMilestone,
  MortgageAmortizationResult,
  MortgageCalculationInput,
  MortgageVsIsaResult,
} from "./types.js";

/**
 * The one repayment formula, unrounded: M = P * [r(1+r)^n] / [(1+r)^n - 1], where r is a twelfth
 * of the yearly rate. At 0% the principal is repaid in equal parts (P / n). Returns 0 for a
 * missing or non-positive principal or term, or a negative rate, so callers never get NaN or
 * Infinity. Both `calculateMonthlyMortgagePayment` and `calculateMortgagePayment` use it.
 */
function repaymentPerMonth(
  principalGbp: number,
  annualRatePct: number,
  termMonths: number,
): number {
  if (!(principalGbp > 0) || !(termMonths > 0) || !(annualRatePct >= 0)) return 0;
  if (annualRatePct === 0) return principalGbp / termMonths;
  const r = annualRatePct / 100 / 12;
  const payment = (principalGbp * (r * (1 + r) ** termMonths)) / ((1 + r) ** termMonths - 1);
  return Number.isFinite(payment) ? payment : 0;
}

/**
 * Standard UK repayment mortgage monthly payment, rounded to the penny, over a term in months.
 * At 0% the principal is repaid in equal parts.
 */
export function calculateMonthlyMortgagePayment(
  principalGbp: number,
  annualInterestRatePct: number,
  termMonths: number,
): number {
  return Math.round(repaymentPerMonth(principalGbp, annualInterestRatePct, termMonths) * 100) / 100;
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

export type MortgageType = "repayment" | "interest-only";

/**
 * Unrounded monthly mortgage payment for repayment and interest-only mortgages, over a term in
 * years. Repayment uses the same formula as `calculateMonthlyMortgagePayment`, so the two agree
 * to the penny, including at 0% (equal parts). Interest-only at 0% is 0. Returns 0 when the
 * balance or (for repayment) term is missing, or the rate is negative, so callers never render
 * NaN or Infinity.
 */
export function calculateMortgagePayment(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
  type: MortgageType = "repayment",
): number {
  if (type === "interest-only") {
    return loanAmount > 0 && annualRatePct > 0 ? (loanAmount * annualRatePct) / 100 / 12 : 0;
  }
  return repaymentPerMonth(loanAmount, annualRatePct, termYears * 12);
}

export interface MortgageCostSummary {
  monthlyPayment: number;
  scheduledTotal: number;
  totalInterest: number;
  totalPaid: number;
  interestPercentage: number;
}

/**
 * Computes total interest, total to pay, and interest share over the remaining mortgage term.
 * Returns null when any required input is missing or non-positive.
 */
export function calculateMortgageCostSummary(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
  type: MortgageType = "repayment",
): MortgageCostSummary | null {
  if (!(loanAmount > 0 && annualRatePct > 0 && termYears > 0)) return null;
  const monthlyPayment = calculateMortgagePayment(loanAmount, annualRatePct, termYears, type);
  if (!(monthlyPayment > 0)) return null;
  const isInterestOnly = type === "interest-only";
  const scheduledTotal = monthlyPayment * termYears * 12;
  const totalInterest = isInterestOnly ? scheduledTotal : Math.max(0, scheduledTotal - loanAmount);
  const totalPaid = isInterestOnly ? totalInterest + loanAmount : scheduledTotal;
  const interestPercentage = totalPaid > 0 ? (totalInterest / totalPaid) * 100 : 0;
  return {
    monthlyPayment,
    scheduledTotal,
    totalInterest,
    totalPaid,
    interestPercentage,
  };
}

export interface MortgageOverpaymentScheduleInput {
  loanAmount: number;
  annualRatePct: number;
  termYears: number;
  overpayment: number;
  mortgageType?: MortgageType;
}

export interface MortgageOverpaymentScheduleResult {
  monthlyScheduled: number;
  standardBalances: number[];
  overpayBalances: number[];
  standardTotalInterest: number;
  overpayTotalInterest: number;
  interestSaved: number;
  monthsSaved: number;
  newTermMonths: number;
  principalReduced: number;
  totalMonths: number;
}

/**
 * Simulates standard vs overpayment mortgage amortisation month-by-month for repayment and
 * interest-only mortgages. Returns null when required inputs are missing or non-positive.
 */
export function simulateMortgageOverpayment(
  input: MortgageOverpaymentScheduleInput,
): MortgageOverpaymentScheduleResult | null {
  const { loanAmount, annualRatePct, termYears, overpayment, mortgageType = "repayment" } = input;
  if (!(loanAmount > 0 && annualRatePct > 0 && termYears > 0)) return null;

  const isInterestOnly = mortgageType === "interest-only";
  const i = annualRatePct / 100 / 12;
  const totalMonths = Math.round(termYears * 12);
  const monthlyScheduled = calculateMortgagePayment(
    loanAmount,
    annualRatePct,
    termYears,
    mortgageType,
  );
  if (!(monthlyScheduled > 0)) return null;

  const standardBalances: number[] = [loanAmount];
  let standardBalance = loanAmount;
  let standardTotalInterest = 0;

  for (let m = 1; m <= totalMonths; m++) {
    if (isInterestOnly) {
      const interest = standardBalance * i;
      standardTotalInterest += interest;
      standardBalances.push(standardBalance);
    } else {
      if (standardBalance <= 0) {
        standardBalances.push(0);
        continue;
      }
      const interest = standardBalance * i;
      const principal = Math.min(standardBalance, monthlyScheduled - interest);
      standardBalance = Math.max(0, standardBalance - principal);
      standardTotalInterest += interest;
      standardBalances.push(standardBalance);
    }
  }

  const overpayBalances: number[] = [loanAmount];
  let overpayBalance = loanAmount;
  let overpayTotalInterest = 0;
  let overpayMonthsToZero = totalMonths;
  let finishedOverpay = false;

  for (let m = 1; m <= totalMonths; m++) {
    if (overpayBalance <= 0) {
      if (!finishedOverpay) {
        overpayMonthsToZero = m - 1;
        finishedOverpay = true;
      }
      overpayBalances.push(0);
      continue;
    }

    const interest = overpayBalance * i;
    overpayTotalInterest += interest;

    if (isInterestOnly) {
      const principal = Math.min(overpayBalance, overpayment);
      overpayBalance = Math.max(0, overpayBalance - principal);
    } else {
      const totalPayment = monthlyScheduled + overpayment;
      const principal = Math.min(overpayBalance, totalPayment - interest);
      overpayBalance = Math.max(0, overpayBalance - principal);
    }

    overpayBalances.push(overpayBalance);
  }

  if (overpayBalance <= 0 && !finishedOverpay) {
    overpayMonthsToZero = totalMonths;
  }

  const monthsSaved = Math.max(0, totalMonths - overpayMonthsToZero);
  const interestSaved = Math.max(0, standardTotalInterest - overpayTotalInterest);
  const finalOverpayBalance = overpayBalances[overpayBalances.length - 1] ?? 0;
  const principalReduced = Math.max(0, loanAmount - finalOverpayBalance);

  return {
    monthlyScheduled,
    standardBalances,
    overpayBalances,
    standardTotalInterest,
    overpayTotalInterest,
    interestSaved,
    monthsSaved,
    newTermMonths: overpayMonthsToZero,
    principalReduced,
    totalMonths,
  };
}

export interface MortgageOverpayVsSaveInput {
  loanAmount: number;
  annualRatePct: number;
  termYears: number;
  overpayment: number;
  netSavingsRatePct: number;
  horizonYears: number;
  mortgageType?: MortgageType;
}

export interface MortgageOverpayVsSaveResult {
  debtReduction: number;
  savingsBalance: number;
  totalInvested: number;
  mortgageInterestSaved: number;
  savingsInterestEarned: number;
  difference: number;
  isOverpayBetter: boolean;
  actualHorizon: number;
}

/**
 * Compares overpaying a mortgage against putting the same monthly amount into savings over
 * `horizonYears`.
 */
export function compareMortgageOverpayVsSave(
  input: MortgageOverpayVsSaveInput,
): MortgageOverpayVsSaveResult {
  const {
    loanAmount,
    annualRatePct,
    termYears,
    overpayment,
    netSavingsRatePct,
    horizonYears,
    mortgageType = "repayment",
  } = input;

  const isInterestOnly = mortgageType === "interest-only";
  const totalMonths = horizonYears * 12;
  const im = annualRatePct / 100 / 12;
  const is = netSavingsRatePct / 100 / 12;
  const monthlyScheduled = calculateMortgagePayment(
    loanAmount,
    annualRatePct,
    termYears,
    mortgageType,
  );

  let standardBalance = loanAmount;
  let standardCumulativeInterest = 0;
  for (let m = 1; m <= totalMonths; m++) {
    const interest = standardBalance * im;
    standardCumulativeInterest += interest;
    if (!isInterestOnly) {
      const principal = Math.min(standardBalance, monthlyScheduled - interest);
      standardBalance = Math.max(0, standardBalance - principal);
    }
  }

  let overpayBalance = loanAmount;
  let overpayCumulativeInterest = 0;
  for (let m = 1; m <= totalMonths; m++) {
    const interest = overpayBalance * im;
    overpayCumulativeInterest += interest;
    if (isInterestOnly) {
      const principal = Math.min(overpayBalance, overpayment);
      overpayBalance = Math.max(0, overpayBalance - principal);
    } else {
      const principal = Math.min(overpayBalance, monthlyScheduled + overpayment - interest);
      overpayBalance = Math.max(0, overpayBalance - principal);
    }
  }

  const principalReduced = Math.max(0, standardBalance - overpayBalance);
  const cumulativeInterestSaved = Math.max(
    0,
    standardCumulativeInterest - overpayCumulativeInterest,
  );
  const debtReduction = isInterestOnly
    ? principalReduced + cumulativeInterestSaved
    : principalReduced;

  let savingsBalance = 0;
  for (let m = 1; m <= totalMonths; m++) {
    savingsBalance = savingsBalance * (1 + is) + overpayment;
  }

  const totalInvested = overpayment * totalMonths;
  const mortgageInterestSaved = isInterestOnly
    ? cumulativeInterestSaved
    : Math.max(0, debtReduction - totalInvested);
  const savingsInterestEarned = Math.max(0, savingsBalance - totalInvested);
  const difference = Math.abs(debtReduction - savingsBalance);
  const isOverpayBetter = debtReduction > savingsBalance;

  return {
    debtReduction,
    savingsBalance,
    totalInvested,
    mortgageInterestSaved,
    savingsInterestEarned,
    difference,
    isOverpayBetter,
    actualHorizon: horizonYears,
  };
}
