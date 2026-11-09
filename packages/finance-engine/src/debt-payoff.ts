import type {
  CrossoverMonth,
  DebtItem,
  DebtPayoffResult,
  DebtPayoffStrategy,
  DebtScheduleMonth,
  DebtScheduleMonthPayment,
  PromoCliffAlert,
} from "./types.js";

export interface DebtPayoffOptions {
  strategy?: DebtPayoffStrategy;
  monthlyExtraBudgetGbp?: number;
  expectedIsaAnnualReturnPct?: number; // default 6%
  referenceDate?: Date;
  maxMonths?: number;
}

/**
 * Filter out UK Student Loans from consumer debt payoff calculations.
 * In the UK, Student Loans are income-contingent graduate taxes collected via PAYE,
 * not commercial debts with standard default risks.
 */
export function filterConsumerDebts(debts: DebtItem[]): {
  consumerDebts: DebtItem[];
  excludedStudentLoans: DebtItem[];
} {
  const consumerDebts: DebtItem[] = [];
  const excludedStudentLoans: DebtItem[] = [];

  for (const d of debts) {
    if (d.debtType === "student_loan" || d.id.toLowerCase().includes("student_loan")) {
      excludedStudentLoans.push(d);
    } else {
      consumerDebts.push(d);
    }
  }

  return { consumerDebts, excludedStudentLoans };
}

/**
 * Sorts active debts according to strategy:
 * - AVALANCHE: highest APR first. Overdrafts (~35-39.9%) and cards nearing expiry are prioritized.
 * - SNOWBALL: smallest balance first for fastest quick wins.
 */
export function sortDebtsByStrategy(
  debts: { id: string; name: string; balance: number; apr: number }[],
  strategy: DebtPayoffStrategy,
): { id: string; name: string; balance: number; apr: number }[] {
  return [...debts].sort((a, b) => {
    if (strategy === "AVALANCHE") {
      if (b.apr !== a.apr) {
        return b.apr - a.apr;
      }
      return a.balance - b.balance;
    }
    // SNOWBALL
    if (a.balance !== b.balance) {
      return a.balance - b.balance;
    }
    return b.apr - a.apr;
  });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatYearMonth(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Calculate 0% Promotional Balance Transfer Cliff metrics.
 */
export function analyzePromoCliff(
  debt: DebtItem,
  projectedPayoffMonthIndex: number,
  referenceDate: Date,
): PromoCliffAlert | null {
  if (!debt.promoAprExpiryDate) {
    return null;
  }

  const promoExpiry = new Date(debt.promoAprExpiryDate);
  const diffMs = promoExpiry.getTime() - referenceDate.getTime();
  const monthsUntilCliff = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));

  const requiredMonthlyToClearBeforeCliff =
    Math.round((debt.balanceGbp / monthsUntilCliff) * 100) / 100;
  const hasCliffRisk = projectedPayoffMonthIndex > monthsUntilCliff;

  // Estimate balance at expiry if paying standard minimums
  const minimumMonthly = Math.max(5, debt.minimumPaymentGbp);
  const projectedBalanceAtExpiry = Math.max(0, debt.balanceGbp - minimumMonthly * monthsUntilCliff);

  const projectedPayoffDate = new Date(referenceDate);
  projectedPayoffDate.setUTCMonth(projectedPayoffDate.getUTCMonth() + projectedPayoffMonthIndex);

  return {
    debtId: debt.id,
    debtName: debt.name,
    promoExpiryDate: debt.promoAprExpiryDate,
    projectedPayoffDate: formatMonthYear(projectedPayoffDate),
    projectedBalanceAtExpiryGbp: Math.round(projectedBalanceAtExpiry * 100) / 100,
    revertApr: debt.revertApr ?? 24.9,
    requiredMonthlyToClearBeforeCliff,
    hasCliffRisk,
  };
}

/**
 * Generates the 5-year (60 month) post-debt ISA wealth crossover projection.
 */
export function projectCrossoverWealth(
  totalMonthlyPaymentGbp: number,
  debtFreeDate: Date,
  annualIsaReturnPct = 6.0,
): CrossoverMonth[] {
  const monthlyRate = (1 + annualIsaReturnPct / 100) ** (1 / 12) - 1;
  const projection: CrossoverMonth[] = [];

  let accumulatedWealth = 0;
  let totalContributed = 0;

  const curDate = new Date(debtFreeDate);

  for (let m = 1; m <= 60; m++) {
    curDate.setUTCMonth(curDate.getUTCMonth() + 1);
    totalContributed += totalMonthlyPaymentGbp;
    // Compound previous balance + new contribution
    accumulatedWealth = (accumulatedWealth + totalMonthlyPaymentGbp) * (1 + monthlyRate);
    const interestEarned = Math.max(0, accumulatedWealth - totalContributed);

    projection.push({
      monthIndex: m,
      calendarDate: formatYearMonth(curDate),
      monthlyContributionGbp: Math.round(totalMonthlyPaymentGbp),
      totalContributedGbp: Math.round(totalContributed),
      projectedWealthGbp: Math.round(accumulatedWealth),
      interestEarnedGbp: Math.round(interestEarned),
    });
  }

  return projection;
}

/**
 * Core Debt Payoff Schedule Generator (Snowball & Avalanche).
 */
export function calculateDebtSchedule(
  debts: DebtItem[],
  monthlyExtraBudgetGbp = 0,
  strategy: DebtPayoffStrategy = "AVALANCHE",
  options: DebtPayoffOptions = {},
): DebtPayoffResult {
  const { consumerDebts } = filterConsumerDebts(debts);
  const referenceDate = options.referenceDate ?? new Date();
  const maxMonths = options.maxMonths ?? 360;
  const expectedReturn = options.expectedIsaAnnualReturnPct ?? 6.0;

  const totalStartingDebt = consumerDebts.reduce((sum, d) => sum + Math.max(0, d.balanceGbp), 0);

  if (totalStartingDebt <= 0 || consumerDebts.length === 0) {
    const crossover = projectCrossoverWealth(monthlyExtraBudgetGbp, referenceDate, expectedReturn);
    return {
      strategy,
      totalStartingDebtGbp: 0,
      totalInterestPaidGbp: 0,
      monthsToPayoff: 0,
      debtFreeDate: formatMonthYear(referenceDate),
      interestSavedVsMinimumGbp: 0,
      promoCliffAlerts: [],
      schedule: [],
      crossoverProjection: crossover,
      fiveYearPostDebtWealthGbp: crossover[crossover.length - 1]?.projectedWealthGbp ?? 0,
    };
  }

  // Track active balances
  interface ActiveDebtState {
    id: string;
    name: string;
    balance: number;
    apr: number;
    minimumPayment: number;
    promoExpiryDate?: string;
    revertApr?: number;
    monthPaidOff?: number;
  }

  const activeDebts: ActiveDebtState[] = consumerDebts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: Math.max(0, d.balanceGbp),
    apr: Math.max(0, d.interestRateApr),
    minimumPayment: Math.max(5, d.minimumPaymentGbp),
    promoExpiryDate: d.promoAprExpiryDate,
    revertApr: d.revertApr,
  }));

  const totalMinimumPayment = activeDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalMonthlyCommitment = totalMinimumPayment + Math.max(0, monthlyExtraBudgetGbp);

  const schedule: DebtScheduleMonth[] = [];
  let totalInterestPaid = 0;
  let firstQuickWinDate: string | undefined;
  let firstQuickWinDebtName: string | undefined;

  const simDate = new Date(referenceDate);

  let month = 0;
  while (month < maxMonths) {
    month++;
    simDate.setUTCMonth(simDate.getUTCMonth() + 1);

    const remainingDebts = activeDebts.filter((d) => d.balance > 0.01);
    if (remainingDebts.length === 0) {
      month--;
      break;
    }

    // Sort remaining debts for this month according to strategy
    const sortedRemaining = sortDebtsByStrategy(remainingDebts, strategy);
    const targetPriorityDebtId = sortedRemaining[0]?.id;

    // First: compute interest and mandatory minimum payments
    let availableBudgetThisMonth = totalMonthlyCommitment;
    const monthPayments: DebtScheduleMonthPayment[] = [];
    let monthTotalInterest = 0;
    let monthTotalPrincipal = 0;

    // Apply monthly interest
    for (const d of remainingDebts) {
      // Check if 0% promo has expired
      let currentApr = d.apr;
      if (d.promoExpiryDate) {
        const expiry = new Date(d.promoExpiryDate);
        if (simDate.getTime() >= expiry.getTime() && d.revertApr) {
          currentApr = d.revertApr;
        }
      }

      const monthlyInterestRate = currentApr / 100 / 12;
      const interest = Math.round(d.balance * monthlyInterestRate * 100) / 100;
      d.balance += interest;
      totalInterestPaid += interest;
      monthTotalInterest += interest;
    }

    // Pay minimums on all debts
    for (const d of remainingDebts) {
      const minPayment = Math.min(d.balance, d.minimumPayment);
      d.balance -= minPayment;
      availableBudgetThisMonth -= minPayment;
      monthTotalPrincipal += minPayment;

      monthPayments.push({
        debtId: d.id,
        debtName: d.name,
        startingBalanceGbp: Math.round((d.balance + minPayment) * 100) / 100,
        interestChargedGbp: 0, // Recorded aggregated
        principalPaidGbp: Math.round(minPayment * 100) / 100,
        endingBalanceGbp: Math.round(d.balance * 100) / 100,
        isPaidOff: d.balance <= 0.01,
      });

      if (d.balance <= 0.01 && !d.monthPaidOff) {
        d.monthPaidOff = month;
        if (!firstQuickWinDate) {
          firstQuickWinDate = formatMonthYear(simDate);
          firstQuickWinDebtName = d.name;
        }
      }
    }

    // Allocate any extra available budget to priority target debt(s)
    if (availableBudgetThisMonth > 0) {
      for (const target of sortedRemaining) {
        const debtObj = activeDebts.find((x) => x.id === target.id);
        if (!debtObj || debtObj.balance <= 0.01) continue;

        const extraToPay = Math.min(debtObj.balance, availableBudgetThisMonth);
        debtObj.balance -= extraToPay;
        availableBudgetThisMonth -= extraToPay;
        monthTotalPrincipal += extraToPay;

        const paymentRecord = monthPayments.find((p) => p.debtId === debtObj.id);
        if (paymentRecord) {
          paymentRecord.principalPaidGbp += Math.round(extraToPay * 100) / 100;
          paymentRecord.endingBalanceGbp = Math.round(debtObj.balance * 100) / 100;
          paymentRecord.isPaidOff = debtObj.balance <= 0.01;
        }

        if (debtObj.balance <= 0.01 && !debtObj.monthPaidOff) {
          debtObj.monthPaidOff = month;
          if (!firstQuickWinDate) {
            firstQuickWinDate = formatMonthYear(simDate);
            firstQuickWinDebtName = debtObj.name;
          }
        }

        if (availableBudgetThisMonth <= 0.01) break;
      }
    }

    const currentTotalRemaining = activeDebts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);

    schedule.push({
      monthIndex: month,
      calendarDate: formatYearMonth(simDate),
      totalPaymentsGbp: Math.round((monthTotalInterest + monthTotalPrincipal) * 100) / 100,
      totalInterestGbp: Math.round(monthTotalInterest * 100) / 100,
      totalPrincipalGbp: Math.round(monthTotalPrincipal * 100) / 100,
      remainingDebtGbp: Math.round(currentTotalRemaining * 100) / 100,
      payments: monthPayments,
    });

    if (currentTotalRemaining <= 0.01) {
      break;
    }
  }

  const debtFreeDateFormatted = formatMonthYear(simDate);

  // Analyze promo cliffs
  const promoCliffAlerts: PromoCliffAlert[] = [];
  for (const d of consumerDebts) {
    if (d.promoAprExpiryDate) {
      const activeState = activeDebts.find((x) => x.id === d.id);
      const payoffMonth = activeState?.monthPaidOff ?? month;
      const alert = analyzePromoCliff(d, payoffMonth, referenceDate);
      if (alert) {
        promoCliffAlerts.push(alert);
      }
    }
  }

  // Calculate interest saved vs paying minimums only
  // Baseline minimums total interest approximation
  let minOnlyInterest = 0;
  for (const d of consumerDebts) {
    const monthlyRate = d.interestRateApr / 100 / 12;
    if (monthlyRate > 0) {
      // Rough amortization with minimums
      const estMonths = Math.min(360, Math.ceil(d.balanceGbp / Math.max(5, d.minimumPaymentGbp)));
      minOnlyInterest += d.balanceGbp * monthlyRate * (estMonths / 2);
    }
  }
  const interestSavedVsMinimum = Math.max(
    0,
    Math.round((minOnlyInterest - totalInterestPaid) * 100) / 100,
  );

  // 5-Year Crossover projection starting at month M+1
  const crossoverProjection = projectCrossoverWealth(
    totalMonthlyCommitment,
    simDate,
    expectedReturn,
  );
  const fiveYearPostDebtWealth =
    crossoverProjection[crossoverProjection.length - 1]?.projectedWealthGbp ?? 0;

  return {
    strategy,
    totalStartingDebtGbp: Math.round(totalStartingDebt * 100) / 100,
    totalInterestPaidGbp: Math.round(totalInterestPaid * 100) / 100,
    monthsToPayoff: month,
    debtFreeDate: debtFreeDateFormatted,
    firstQuickWinDate,
    firstQuickWinDebtName,
    interestSavedVsMinimumGbp: interestSavedVsMinimum,
    promoCliffAlerts,
    schedule,
    crossoverProjection,
    fiveYearPostDebtWealthGbp: fiveYearPostDebtWealth,
  };
}
