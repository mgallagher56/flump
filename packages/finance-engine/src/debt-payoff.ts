import { STUDENT_LOAN_WRITE_OFF_YEARS } from "./tax-rules.js";
import type {
  AvalancheVsSnowballComparison,
  CarFinanceBalloonResult,
  CrossoverMonth,
  DebtItem,
  DebtPayoffResult,
  DebtPayoffStrategy,
  DebtScheduleMonth,
  DebtScheduleMonthPayment,
  DebtToWealthBridgePoint,
  NormalizedDebtItem,
  OverdraftCostResult,
  PayoffResult,
  PayoffScheduleMonth,
  PromoCliffAlert,
  StudentLoanEvaluationResult,
  ZeroPercentCliffResult,
} from "./types.js";
import { toStudentLoanPlanKey } from "./uk-tax.js";
import {
  calculateStudentLoanRepayment,
  getUkTaxYearRules,
  resolveUkTaxYear,
  roundPence,
} from "./uk-tax-year.js";

export interface DebtPayoffOptions {
  strategy?: DebtPayoffStrategy;
  monthlyExtraBudgetGbp?: number;
  expectedIsaAnnualReturnPct?: number; // default 6%
  referenceDate?: Date;
  maxMonths?: number;
}

/**
 * Normalizes any DebtItem variation to ensure canonical field presence.
 */
export function normalizeDebtItem(
  item: Partial<DebtItem> & { id: string; name: string },
): NormalizedDebtItem {
  const balanceGbp = item.balanceGbp ?? item.balance ?? 0;
  const interestRateApr = item.interestRateApr ?? item.apr ?? 0;
  const minimumPaymentGbp = item.minimumPaymentGbp ?? item.minimumPayment ?? 0;
  const debtType = item.debtType ?? item.type ?? "other";

  return {
    id: item.id,
    name: item.name,
    balanceGbp,
    interestRateApr,
    minimumPaymentGbp,
    debtType,
    promoAprExpiryDate: item.promoAprExpiryDate,
    revertApr: item.revertApr,
    creditLimitGbp: item.creditLimitGbp,
    balance: balanceGbp,
    apr: interestRateApr,
    minimumPayment: minimumPaymentGbp,
    type: debtType,
    promotionalExpiryMonths: item.promotionalExpiryMonths,
    balloonPayment: item.balloonPayment,
    studentLoanPlan: item.studentLoanPlan,
    aprKnown: item.aprKnown,
    minimumPaymentEstimated: item.minimumPaymentEstimated,
  };
}

/**
 * Filter out UK Student Loans from consumer debt payoff calculations.
 * In the UK, Student Loans are income-contingent graduate taxes collected via PAYE,
 * not commercial debts with standard default risks.
 */
export function filterConsumerDebts(debts: DebtItem[]): {
  consumerDebts: NormalizedDebtItem[];
  excludedStudentLoans: NormalizedDebtItem[];
} {
  const consumerDebts: NormalizedDebtItem[] = [];
  const excludedStudentLoans: NormalizedDebtItem[] = [];

  for (const raw of debts) {
    const d = normalizeDebtItem(raw);
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
  debts: { id: string; name: string; balance: number; apr: number; aprKnown?: boolean }[],
  strategy: DebtPayoffStrategy,
): { id: string; name: string; balance: number; apr: number; aprKnown?: boolean }[] {
  return [...debts].sort((a, b) => {
    if (strategy === "AVALANCHE") {
      // Debts with an unset APR go last until the APR is entered.
      const aUnknown = a.aprKnown === false;
      const bUnknown = b.aprKnown === false;
      if (aUnknown !== bUnknown) {
        return aUnknown ? 1 : -1;
      }
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
  rawDebt: DebtItem,
  projectedPayoffMonthIndex: number,
  referenceDate: Date,
): PromoCliffAlert | null {
  const debt = normalizeDebtItem(rawDebt);
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

interface SimDebtState {
  id: string;
  name: string;
  balance: number;
  apr: number;
  aprKnown?: boolean;
  minimumPayment: number;
  promoExpiryDate?: string;
  revertApr?: number;
  monthPaidOff?: number;
}

/** Internal shared simulation core (main run and minimum-only baseline). No recursion. */
interface DebtSimulation {
  schedule: DebtScheduleMonth[];
  totalInterestPaid: number;
  month: number;
  simDate: Date;
  activeDebts: SimDebtState[];
  totalMonthlyCommitment: number;
  remainingGbp: number;
  firstQuickWinDate?: string;
  firstQuickWinDebtName?: string;
  firstQuickWinMonth?: number;
}

function simulateSchedule(
  consumerDebts: NormalizedDebtItem[],
  monthlyExtraBudgetGbp: number,
  strategy: DebtPayoffStrategy,
  referenceDate: Date,
  maxMonths: number,
  rolloverFreedMinimums = true,
): DebtSimulation {
  // Track active balances

  const activeDebts: SimDebtState[] = consumerDebts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: Math.max(0, d.balanceGbp),
    apr: Math.max(0, d.interestRateApr),
    aprKnown: d.aprKnown,
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
  let firstQuickWinMonth: number | undefined;

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
          firstQuickWinMonth = month;
        }
      }
    }

    // Allocate any extra available budget to priority target debt(s)
    // Minimum-only baseline (rollover off): freed minimums are not redirected to any debt.
    if (rolloverFreedMinimums && availableBudgetThisMonth > 0) {
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
            firstQuickWinMonth = month;
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

  const remainingGbp = activeDebts.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
  return {
    schedule,
    totalInterestPaid,
    month,
    simDate,
    activeDebts,
    totalMonthlyCommitment,
    remainingGbp,
    firstQuickWinDate,
    firstQuickWinDebtName,
    firstQuickWinMonth,
  };
}

/** PayoffResult.debtFreeDate is a string; this label stands in when payoff is not achievable. */
const NOT_ACHIEVABLE_LABEL = "Not payable at current payments";

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
      payoffAchievable: true,
      interestSavedVsMinimumGbp: 0,
      promoCliffAlerts: [],
      schedule: [],
      crossoverProjection: crossover,
      fiveYearPostDebtWealthGbp: crossover[crossover.length - 1]?.projectedWealthGbp ?? 0,
    };
  }

  const main = simulateSchedule(
    consumerDebts,
    monthlyExtraBudgetGbp,
    strategy,
    referenceDate,
    maxMonths,
  );
  const {
    schedule,
    totalInterestPaid,
    month,
    simDate,
    activeDebts,
    totalMonthlyCommitment,
    firstQuickWinDate,
    firstQuickWinDebtName,
    firstQuickWinMonth,
  } = main;

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

  // Interest saved vs paying minimums only: simulate a true minimum-only baseline with the
  // same engine (zero extra budget, no rollover: each debt pays only its own minimum until
  // it clears). simulateSchedule never computes a baseline itself, so there is no recursion. If the baseline never clears within maxMonths, its interest
  // is the interest accrued up to the cap, so the saving is a lower bound.
  const baseline = simulateSchedule(consumerDebts, 0, strategy, referenceDate, maxMonths, false);
  const interestSavedVsMinimum = Math.max(
    0,
    Math.round((baseline.totalInterestPaid - totalInterestPaid) * 100) / 100,
  );

  // Achievability: the loop ends either cleared or capped at maxMonths. If capped, the
  // balance is growing when the final month did not reduce the total outstanding.
  const payoffAchievable = main.remainingGbp <= 0.01;
  let unachievableReason: DebtPayoffResult["unachievableReason"];
  if (!payoffAchievable) {
    const previousRemaining =
      schedule.length >= 2
        ? (schedule[schedule.length - 2]?.remainingDebtGbp ?? 0)
        : totalStartingDebt;
    const lastRemaining = schedule[schedule.length - 1]?.remainingDebtGbp ?? main.remainingGbp;
    unachievableReason =
      lastRemaining >= previousRemaining ? "BALANCE_GROWING" : "MAX_MONTHS_REACHED";
  }

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
    debtFreeDate: payoffAchievable ? debtFreeDateFormatted : null,
    payoffAchievable,
    unachievableReason,
    firstQuickWinDate,
    firstQuickWinDebtName,
    firstQuickWinMonth,
    interestSavedVsMinimumGbp: interestSavedVsMinimum,
    promoCliffAlerts,
    schedule,
    crossoverProjection,
    fiveYearPostDebtWealthGbp: fiveYearPostDebtWealth,
  };
}

/**
 * Convenience alias for Avalanche payoff simulation.
 */
export function calculateAvalanche(debts: DebtItem[], extraMonthlyPayment = 0): PayoffResult {
  const normalized = debts.map((d) => normalizeDebtItem(d));
  const res = calculateDebtSchedule(normalized, extraMonthlyPayment, "AVALANCHE");

  const monthlySchedule: PayoffScheduleMonth[] = res.schedule.map((s) => {
    const debtBalances: Record<string, number> = {};
    const paymentsMade: Record<string, number> = {};
    s.payments.forEach((p) => {
      debtBalances[p.debtId] = p.endingBalanceGbp;
      paymentsMade[p.debtId] = Math.round((p.principalPaidGbp + p.interestChargedGbp) * 100) / 100;
    });
    return {
      month: s.monthIndex,
      debtBalances,
      totalBalance: s.remainingDebtGbp,
      totalInterestPaidThisMonth: s.totalInterestGbp,
      cumulativeInterest: 0,
      paymentsMade,
    };
  });

  return {
    months: res.monthsToPayoff,
    debtFreeDate: res.debtFreeDate ?? NOT_ACHIEVABLE_LABEL,
    payoffAchievable: res.payoffAchievable,
    unachievableReason: res.unachievableReason,
    totalInterest: res.totalInterestPaidGbp,
    totalPaid: Math.round((res.totalStartingDebtGbp + res.totalInterestPaidGbp) * 100) / 100,
    quickWinDebtName: res.firstQuickWinDebtName,
    quickWinMonths: res.firstQuickWinMonth,
    monthlySchedule,
  };
}

/**
 * Convenience alias for Snowball payoff simulation.
 */
export function calculateSnowball(debts: DebtItem[], extraMonthlyPayment = 0): PayoffResult {
  const normalized = debts.map((d) => normalizeDebtItem(d));
  const res = calculateDebtSchedule(normalized, extraMonthlyPayment, "SNOWBALL");

  const monthlySchedule: PayoffScheduleMonth[] = res.schedule.map((s) => {
    const debtBalances: Record<string, number> = {};
    const paymentsMade: Record<string, number> = {};
    s.payments.forEach((p) => {
      debtBalances[p.debtId] = p.endingBalanceGbp;
      paymentsMade[p.debtId] = Math.round((p.principalPaidGbp + p.interestChargedGbp) * 100) / 100;
    });
    return {
      month: s.monthIndex,
      debtBalances,
      totalBalance: s.remainingDebtGbp,
      totalInterestPaidThisMonth: s.totalInterestGbp,
      cumulativeInterest: 0,
      paymentsMade,
    };
  });

  return {
    months: res.monthsToPayoff,
    debtFreeDate: res.debtFreeDate ?? NOT_ACHIEVABLE_LABEL,
    payoffAchievable: res.payoffAchievable,
    unachievableReason: res.unachievableReason,
    totalInterest: res.totalInterestPaidGbp,
    totalPaid: Math.round((res.totalStartingDebtGbp + res.totalInterestPaidGbp) * 100) / 100,
    quickWinDebtName: res.firstQuickWinDebtName,
    quickWinMonths: res.firstQuickWinMonth,
    monthlySchedule,
  };
}

/**
 * Minimum-only payoff calculation baseline.
 */
export function calculateMinimumOnly(debts: DebtItem[]): PayoffResult {
  return calculateAvalanche(debts, 0);
}

/**
 * Compares Avalanche and Snowball payoff strategies side by side.
 */
export function compareAvalancheAndSnowball(
  debts: DebtItem[],
  extraMonthlyPayment = 50,
): AvalancheVsSnowballComparison {
  const avalanche = calculateAvalanche(debts, extraMonthlyPayment);
  const snowball = calculateSnowball(debts, extraMonthlyPayment);
  const minimumOnly = calculateMinimumOnly(debts);

  const interestSavedAvalancheVsMin = Math.max(
    0,
    minimumOnly.totalInterest - avalanche.totalInterest,
  );
  const monthsShavedAvalancheVsMin = Math.max(0, minimumOnly.months - avalanche.months);
  const interestSavedAvalancheVsSnowball = Math.max(
    0,
    snowball.totalInterest - avalanche.totalInterest,
  );

  const quickWinText = snowball.quickWinDebtName
    ? `Clear your ${snowball.quickWinDebtName} with Snowball momentum`
    : "Achieve your first payoff milestone quickly";

  return {
    avalanche,
    snowball,
    minimumOnly,
    interestSavedAvalancheVsMin: Math.round(interestSavedAvalancheVsMin * 100) / 100,
    monthsShavedAvalancheVsMin,
    interestSavedAvalancheVsSnowball: Math.round(interestSavedAvalancheVsSnowball * 100) / 100,
    snowballFirstWinDescription: quickWinText,
  };
}

/**
 * 0% Balance Transfer Promotional Cliff Tracker.
 */
export function calculateZeroPercentCliff(
  balance: number,
  monthsRemaining: number,
  revertApr = 24.9,
  currentMonthlyPayment = 0,
): ZeroPercentCliffResult {
  if (monthsRemaining <= 0 || balance <= 0) {
    return {
      requiredMonthlyPayment: balance,
      balanceRemainingIfMinimum: balance,
      penaltyInterestFirstYearIfUnpaid: Math.round(balance * (revertApr / 100) * 100) / 100,
      daysRemaining: 0,
      alertRequired: true,
    };
  }

  const requiredMonthlyPayment = Math.round((balance / monthsRemaining) * 100) / 100;
  const simulatedMin =
    currentMonthlyPayment > 0 ? currentMonthlyPayment : Math.max(balance * 0.02, 25);
  const balanceRemainingIfMinimum = Math.max(
    0,
    Math.round((balance - simulatedMin * monthsRemaining) * 100) / 100,
  );
  const penaltyInterestFirstYearIfUnpaid =
    Math.round(balanceRemainingIfMinimum * (revertApr / 100) * 100) / 100;
  const daysRemaining = Math.max(0, Math.round(monthsRemaining * 30.4375));
  const alertRequired = daysRemaining <= 60 && balanceRemainingIfMinimum > 10;

  return {
    requiredMonthlyPayment,
    balanceRemainingIfMinimum,
    penaltyInterestFirstYearIfUnpaid,
    daysRemaining,
    alertRequired,
  };
}

/**
 * Arranged Overdraft Cost Calculator (UK banks charge EAR ~35% - 39.9%).
 */
export function calculateOverdraftCost(balance: number, earRate = 39.9): OverdraftCostResult {
  if (balance <= 0) {
    return { annualPoundCost: 0, monthlyPoundCost: 0, effectiveApr: earRate };
  }
  const annualPoundCost = Math.round(balance * (earRate / 100) * 100) / 100;
  const monthlyPoundCost = Math.round((annualPoundCost / 12) * 100) / 100;

  return {
    annualPoundCost,
    monthlyPoundCost,
    effectiveApr: earRate,
  };
}

/**
 * PCP / HP Car Finance Balloon Payment Tracker.
 */
export function calculateCarFinanceBalloon(
  monthlyPayment: number,
  monthsRemaining: number,
  balloonAmount: number,
): CarFinanceBalloonResult {
  const safeMonths = Math.max(monthsRemaining, 1);
  const monthlySinkingFundNeeded = Math.round((balloonAmount / safeMonths) * 100) / 100;
  const totalCostOfFinance = Math.round((monthlyPayment * safeMonths + balloonAmount) * 100) / 100;

  return {
    balloonAmount,
    dueMonths: monthsRemaining,
    monthlySinkingFundNeeded,
    totalCostOfFinance,
  };
}

/**
 * UK Student Loan Evaluation (Plans 1, 2, 4, 5 & Postgraduate).
 */
export function evaluateUkStudentLoan(
  plan: "plan1" | "plan2" | "plan4" | "plan5" | "postgrad" | string,
  annualSalary: number,
  currentBalance: number,
  taxYear: string = resolveUkTaxYear(),
): StudentLoanEvaluationResult {
  const rules = getUkTaxYearRules(resolveUkTaxYear(taxYear));

  // PLAN_2 and plan2 spellings agree; an unrecognised plan falls back to Plan 2 (as before).
  const key = toStudentLoanPlanKey(plan) ?? "plan2";
  const entry = rules.studentLoans.plans[key];
  // calculateStudentLoanRepayment throws UnsupportedUkTaxYearError if the plan has no
  // verified entry for this year (e.g. Plan 4 in 2020/21).
  const annualRepayment = calculateStudentLoanRepayment(annualSalary, key, rules);
  const cfg = {
    threshold: entry!.threshold,
    rate: entry!.rate,
    writeOffYears: STUDENT_LOAN_WRITE_OFF_YEARS[key],
  };
  const monthlyRepayment = roundPence(annualRepayment / 12);

  const interestAccumulation = currentBalance * 0.065;
  const willLikelyRepayBeforeWriteOff =
    annualRepayment > interestAccumulation * 1.5 &&
    currentBalance < annualRepayment * (cfg.writeOffYears / 2);

  const recommendation = willLikelyRepayBeforeWriteOff ? "consider_overpaying" : "do_not_overpay";
  const reasoning = willLikelyRepayBeforeWriteOff
    ? `Based on your salary of £${Math.round(annualSalary).toLocaleString()}, you are projected to clear the balance before statutory write-off.`
    : `Your annual repayment of £${Math.round(annualRepayment).toLocaleString()} is insufficient to clear the £${Math.round(currentBalance).toLocaleString()} balance before the ${cfg.writeOffYears}-year statutory cancellation. Any voluntary overpayments act as an effective gift to HM Treasury. Prioritise emergency savings or commercial debts instead.`;

  return {
    plan: key,
    annualRepayment,
    monthlyRepayment,
    threshold: cfg.threshold,
    rate: cfg.rate * 100,
    writeOffYears: cfg.writeOffYears,
    willLikelyRepayBeforeWriteOff,
    recommendation,
    reasoning,
  };
}

/**
 * The "Redirect Surplus to Wealth" Bridge Chart.
 */
export function calculateDebtToWealthBridge(
  debts: DebtItem[],
  extraMonthlyPayment = 50,
  investmentAnnualReturnPct = 6.0,
  postDebtYears = 5,
): DebtToWealthBridgePoint[] {
  const normalized = debts.map((d) => normalizeDebtItem(d));
  const payoff = calculateDebtSchedule(normalized, extraMonthlyPayment, "AVALANCHE");
  const payoffMonths = payoff.monthsToPayoff;
  const commercialDebts = filterConsumerDebts(normalized).consumerDebts;
  const totalMin = commercialDebts.reduce((sum, d) => sum + d.minimumPaymentGbp, 0);
  const monthlyFreedCash = totalMin + extraMonthlyPayment;

  const monthlyGrowthRate = investmentAnnualReturnPct / 100 / 12;
  const postDebtMonths = postDebtYears * 12;
  const totalHorizonMonths = payoffMonths + postDebtMonths;

  const points: DebtToWealthBridgePoint[] = [];
  let currentWealth = 0;

  for (let m = 0; m <= totalHorizonMonths; m++) {
    const isPost = m > payoffMonths;
    let debtRemaining = 0;

    if (m === 0) {
      debtRemaining = commercialDebts.reduce((sum, d) => sum + d.balanceGbp, 0);
    } else if (m <= payoffMonths) {
      const scheduleEntry = payoff.schedule[m - 1];
      debtRemaining = scheduleEntry ? scheduleEntry.remainingDebtGbp : 0;
    } else {
      debtRemaining = 0;
      currentWealth = (currentWealth + monthlyFreedCash) * (1 + monthlyGrowthRate);
    }

    if (m === 0 || m === payoffMonths || m % 3 === 0 || m === totalHorizonMonths) {
      points.push({
        month: m,
        yearNumber: Math.round((m / 12) * 10) / 10,
        debtRemaining: Math.round(debtRemaining),
        wealthAccumulated: Math.round(currentWealth),
        isPostDebtFree: isPost,
      });
    }
  }

  return points;
}
