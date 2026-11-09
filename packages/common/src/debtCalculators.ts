export interface DebtItem {
  id: string;
  name: string;
  balance: number;
  apr: number; // e.g. 21.9 for 21.9%
  minimumPayment: number;
  type?: "credit_card" | "loan" | "overdraft" | "bnpl" | "car_finance" | "student_loan" | "other";
  promotionalExpiryMonths?: number;
  revertApr?: number;
  balloonPayment?: { amount: number; dueMonths: number };
  studentLoanPlan?: "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";
}

export interface PayoffScheduleMonth {
  month: number;
  debtBalances: Record<string, number>;
  totalBalance: number;
  totalInterestPaidThisMonth: number;
  cumulativeInterest: number;
  paymentsMade: Record<string, number>;
}

export interface PayoffResult {
  months: number;
  debtFreeDate: string;
  totalInterest: number;
  totalPaid: number;
  quickWinDebtName?: string;
  quickWinMonths?: number;
  monthlySchedule: PayoffScheduleMonth[];
}

export interface AvalancheVsSnowballComparison {
  avalanche: PayoffResult;
  snowball: PayoffResult;
  minimumOnly: PayoffResult;
  interestSavedAvalancheVsMin: number;
  monthsShavedAvalancheVsMin: number;
  interestSavedAvalancheVsSnowball: number;
  snowballFirstWinDescription: string;
}

export type FinancialLifecycleStage = "stabilize" | "buffer" | "optimize";

export interface FinancialStageEvaluation {
  stage: FinancialLifecycleStage;
  totalUnsecuredDebt: number;
  highInterestDebt: number;
  monthlySurplus: number;
  emergencyRunwayMonths: number;
  starterBufferMet: boolean;
  primaryHeroMetric: "unsecured_debt" | "emergency_runway" | "net_worth";
  headline: string;
  subline: string;
}

export interface ZeroPercentCliffResult {
  requiredMonthlyPayment: number;
  balanceRemainingIfMinimum: number;
  penaltyInterestFirstYearIfUnpaid: number;
  daysRemaining: number;
  alertRequired: boolean;
}

export interface OverdraftCostResult {
  annualPoundCost: number;
  monthlyPoundCost: number;
  effectiveApr: number;
}

export interface CarFinanceBalloonResult {
  balloonAmount: number;
  dueMonths: number;
  monthlySinkingFundNeeded: number;
  totalCostOfFinance: number;
}

export interface StudentLoanEvaluationResult {
  plan: "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";
  annualRepayment: number;
  monthlyRepayment: number;
  threshold: number;
  rate: number;
  writeOffYears: number;
  willLikelyRepayBeforeWriteOff: boolean;
  recommendation: "do_not_overpay" | "consider_overpaying";
  reasoning: string;
}

export interface DebtToWealthBridgePoint {
  month: number;
  yearNumber: number;
  debtRemaining: number;
  wealthAccumulated: number;
  isPostDebtFree: boolean;
}

export interface SafeToSpendResult {
  weeklyAllowance: number;
  dailyAllowance: number;
  monthlyDiscretionary: number;
  fixedCommitments: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatFutureDate(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Filter out student loans from commercial debt payoff calculations.
 * UK Student Loans function like a graduate tax and should not be paid down in snowballs.
 */
function getCommercialDebts(debts: DebtItem[]): DebtItem[] {
  return debts.filter((d) => d.type !== "student_loan" && d.balance > 0);
}

/**
 * Simulates monthly payoff schedule given an ordering priority (Avalanche or Snowball)
 * and an extra monthly amount allocated to the priority debt.
 */
function simulatePayoff(
  debts: DebtItem[],
  strategy: "avalanche" | "snowball" | "minimum_only",
  extraMonthlyPayment = 0,
): PayoffResult {
  const eligible = getCommercialDebts(debts);
  if (eligible.length === 0) {
    return {
      months: 0,
      debtFreeDate: formatFutureDate(0),
      totalInterest: 0,
      totalPaid: 0,
      monthlySchedule: [],
    };
  }

  // Clone debts with working balances
  const balances: Record<string, number> = {};
  const initialBalances: Record<string, number> = {};
  const aprMap: Record<string, number> = {};
  const minMap: Record<string, number> = {};
  const nameMap: Record<string, number | string> = {};

  eligible.forEach((d) => {
    balances[d.id] = d.balance;
    initialBalances[d.id] = d.balance;
    aprMap[d.id] = d.apr;
    minMap[d.id] = Math.max(d.minimumPayment, 5); // sensible minimum floor
    nameMap[d.id] = d.name;
  });

  const totalMinimumBaseline = Object.values(minMap).reduce((acc, m) => acc + m, 0);
  const totalBudget =
    totalMinimumBaseline + (strategy === "minimum_only" ? 0 : extraMonthlyPayment);

  let cumulativeInterest = 0;
  let totalPaid = 0;
  let months = 0;
  const maxMonths = 360; // 30-year safety cutoff
  const schedule: PayoffScheduleMonth[] = [];

  let firstWinName: string | undefined;
  let firstWinMonths: number | undefined;

  while (months < maxMonths) {
    const activeDebtIds = Object.keys(balances).filter((id) => balances[id] > 0.01);
    if (activeDebtIds.length === 0) {
      break;
    }

    months += 1;
    let monthlyInterestTotal = 0;
    const paymentsThisMonth: Record<string, number> = {};

    // 1. Accrue monthly interest on each active debt
    activeDebtIds.forEach((id) => {
      const monthlyRate = (aprMap[id] || 0) / 100 / 12;
      const interest = balances[id] * monthlyRate;
      balances[id] += interest;
      monthlyInterestTotal += interest;
      cumulativeInterest += interest;
    });

    // 2. Determine mandatory minimums
    let availableBudget = totalBudget;
    activeDebtIds.forEach((id) => {
      const minDue = Math.min(balances[id], minMap[id]);
      paymentsThisMonth[id] = minDue;
      balances[id] -= minDue;
      availableBudget -= minDue;
      totalPaid += minDue;
    });

    // 3. Allocate remaining surplus to the top priority debt
    if (strategy !== "minimum_only" && availableBudget > 0) {
      // Sort priority based on strategy
      const sortedIds = [...activeDebtIds].sort((a, b) => {
        if (strategy === "avalanche") {
          // Highest APR first
          return (aprMap[b] || 0) - (aprMap[a] || 0);
        }
        // Snowball: Smallest balance first
        return (balances[a] || 0) - (balances[b] || 0);
      });

      for (const priorityId of sortedIds) {
        if (availableBudget <= 0) break;
        const currentBal = balances[priorityId];
        if (currentBal > 0) {
          const extraToApply = Math.min(currentBal, availableBudget);
          balances[priorityId] -= extraToApply;
          paymentsThisMonth[priorityId] = (paymentsThisMonth[priorityId] || 0) + extraToApply;
          availableBudget -= extraToApply;
          totalPaid += extraToApply;
        }
      }
    }

    // Check if any debt was cleared this month
    for (const id of activeDebtIds) {
      if (balances[id] <= 0.01 && !firstWinName) {
        firstWinName = String(nameMap[id]);
        firstWinMonths = months;
      }
    }

    const currentTotalBalance = Object.values(balances).reduce(
      (acc, b) => acc + (b > 0.01 ? b : 0),
      0,
    );

    schedule.push({
      month: months,
      debtBalances: { ...balances },
      totalBalance: Math.round(currentTotalBalance * 100) / 100,
      totalInterestPaidThisMonth: Math.round(monthlyInterestTotal * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
      paymentsMade: paymentsThisMonth,
    });
  }

  return {
    months,
    debtFreeDate: formatFutureDate(months),
    totalInterest: Math.round(cumulativeInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    quickWinDebtName: firstWinName,
    quickWinMonths: firstWinMonths,
    monthlySchedule: schedule,
  };
}

export function calculateAvalanche(debts: DebtItem[], extraMonthlyPayment = 0): PayoffResult {
  return simulatePayoff(debts, "avalanche", extraMonthlyPayment);
}

export function calculateSnowball(debts: DebtItem[], extraMonthlyPayment = 0): PayoffResult {
  return simulatePayoff(debts, "snowball", extraMonthlyPayment);
}

export function calculateMinimumOnly(debts: DebtItem[]): PayoffResult {
  return simulatePayoff(debts, "minimum_only", 0);
}

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

  const quickWinText =
    snowball.quickWinDebtName && snowball.quickWinMonths
      ? `Clear your ${snowball.quickWinDebtName} in ${snowball.quickWinMonths} month${snowball.quickWinMonths === 1 ? "" : "s"}`
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
  // Annual cost based on EAR
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
 * UK student loans operate as a graduate tax wiped after 25-40 years.
 */
export function evaluateUkStudentLoan(
  plan: "plan1" | "plan2" | "plan4" | "plan5" | "postgrad",
  annualSalary: number,
  currentBalance: number,
): StudentLoanEvaluationResult {
  // UK Student Loan Thresholds (2024/25 - 2026/27 guidelines)
  const configs: Record<
    "plan1" | "plan2" | "plan4" | "plan5" | "postgrad",
    { threshold: number; rate: number; writeOffYears: number }
  > = {
    plan1: { threshold: 24990, rate: 0.09, writeOffYears: 25 },
    plan2: { threshold: 27295, rate: 0.09, writeOffYears: 30 },
    plan4: { threshold: 31395, rate: 0.09, writeOffYears: 30 },
    plan5: { threshold: 25000, rate: 0.09, writeOffYears: 40 },
    postgrad: { threshold: 21000, rate: 0.06, writeOffYears: 30 },
  };

  const cfg = configs[plan];
  const taxableExcess = Math.max(0, annualSalary - cfg.threshold);
  const annualRepayment = Math.round(taxableExcess * cfg.rate * 100) / 100;
  const monthlyRepayment = Math.round((annualRepayment / 12) * 100) / 100;

  // Approximate lifetime repayment vs balance growth
  // Average interest on Plan 2 is RPI + up to 3% (~6-8%).
  const interestAccumulation = currentBalance * 0.065;
  const willLikelyRepayBeforeWriteOff =
    annualRepayment > interestAccumulation * 1.5 &&
    currentBalance < annualRepayment * (cfg.writeOffYears / 2);

  const recommendation = willLikelyRepayBeforeWriteOff ? "consider_overpaying" : "do_not_overpay";

  let reasoning = "";
  if (!willLikelyRepayBeforeWriteOff) {
    reasoning = `Your annual repayment of £${Math.round(annualRepayment)} is insufficient to clear the £${Math.round(currentBalance)} balance before the ${cfg.writeOffYears}-year statutory cancellation. Any voluntary overpayments act as an effective gift to HM Treasury. Prioritise emergency savings or commercial debts instead.`;
  } else {
    reasoning = `Based on your salary of £${Math.round(annualSalary)}, you are projected to repay the balance before write-off. Overpaying could save interest, but ensure high-interest consumer debt is £0 first.`;
  }

  return {
    plan,
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
 * Extends payoff chart 5 years (60 months) past the projected Debt-Free Date,
 * showing how redirecting the debt service amount into an ISA turns into positive wealth.
 */
export function calculateDebtToWealthBridge(
  debts: DebtItem[],
  extraMonthlyPayment = 50,
  investmentAnnualReturnPct = 6.0,
  postDebtYears = 5,
): DebtToWealthBridgePoint[] {
  const payoff = calculateAvalanche(debts, extraMonthlyPayment);
  const payoffMonths = payoff.months;
  const commercialDebts = getCommercialDebts(debts);
  const totalMin = commercialDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
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
      debtRemaining = commercialDebts.reduce((sum, d) => sum + d.balance, 0);
    } else if (m <= payoffMonths) {
      const scheduleEntry = payoff.monthlySchedule[m - 1];
      debtRemaining = scheduleEntry ? scheduleEntry.totalBalance : 0;
    } else {
      debtRemaining = 0;
      // Compounding accumulation
      currentWealth = (currentWealth + monthlyFreedCash) * (1 + monthlyGrowthRate);
    }

    // Capture every 3 months or significant boundary to keep points digestible
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

/**
 * Safe-to-Spend Weekly Allowance Metric.
 */
export function calculateSafeToSpend(
  monthlyIncome: number,
  fixedBills: number,
  minDebtPayments: number,
  essentialGroceries: number,
): SafeToSpendResult {
  const fixedCommitments = fixedBills + minDebtPayments + essentialGroceries;
  const monthlyDiscretionary = Math.max(0, monthlyIncome - fixedCommitments);
  // 52 weeks / 12 months = 4.3333 weeks per month
  const weeklyAllowance = Math.round((monthlyDiscretionary / 4.333333) * 100) / 100;
  const dailyAllowance = Math.round((weeklyAllowance / 7) * 100) / 100;

  return {
    weeklyAllowance,
    dailyAllowance,
    monthlyDiscretionary: Math.round(monthlyDiscretionary * 100) / 100,
    fixedCommitments: Math.round(fixedCommitments * 100) / 100,
  };
}

/**
 * Adaptive Financial Lifecycle Stage Evaluator.
 */
export function evaluateFinancialStage(params: {
  debts: DebtItem[];
  monthlySurplus: number;
  liquidSavings: number;
  monthlyEssentialExpenses: number;
}): FinancialStageEvaluation {
  const { debts, monthlySurplus, liquidSavings, monthlyEssentialExpenses } = params;
  const commercial = getCommercialDebts(debts);

  const totalUnsecuredDebt = commercial.reduce((sum, d) => sum + d.balance, 0);
  // High-interest debt is APR >= 6.5% or overdraft
  const highInterestDebt = commercial
    .filter((d) => d.apr >= 6.5 || d.type === "overdraft" || d.type === "credit_card")
    .reduce((sum, d) => sum + d.balance, 0);

  const emergencyRunwayMonths =
    monthlyEssentialExpenses > 0
      ? Math.round((liquidSavings / monthlyEssentialExpenses) * 10) / 10
      : 0;

  const starterBufferMet = liquidSavings >= 1000;

  // Stage 1: Stabilize & Clear
  // Trigger: High-interest debt > 0 OR negative monthly cash flow surplus
  if (highInterestDebt > 50 || monthlySurplus < 0) {
    return {
      stage: "stabilize",
      totalUnsecuredDebt: Math.round(totalUnsecuredDebt),
      highInterestDebt: Math.round(highInterestDebt),
      monthlySurplus: Math.round(monthlySurplus),
      emergencyRunwayMonths,
      starterBufferMet,
      primaryHeroMetric: "unsecured_debt",
      headline: "Stage 1: Stabilise and clear",
      subline: "Clear high-interest liabilities and achieve steady cash-flow margin.",
    };
  }

  // Stage 2: Buffer & Protect
  // Trigger: High-interest debt cleared, building starter £1,000 buffer up to 3-6 month runway
  if (emergencyRunwayMonths < 3) {
    return {
      stage: "buffer",
      totalUnsecuredDebt: Math.round(totalUnsecuredDebt),
      highInterestDebt: 0,
      monthlySurplus: Math.round(monthlySurplus),
      emergencyRunwayMonths,
      starterBufferMet,
      primaryHeroMetric: "emergency_runway",
      headline: "Stage 2: Buffer & Protect",
      subline: "Build your £1,000 starter buffer and establish a 3–6 month emergency reserve.",
    };
  }

  // Stage 3: Build & Optimize
  // Trigger: High-interest debt £0 and Emergency Runway exceeds 3 months
  return {
    stage: "optimize",
    totalUnsecuredDebt: Math.round(totalUnsecuredDebt),
    highInterestDebt: 0,
    monthlySurplus: Math.round(monthlySurplus),
    emergencyRunwayMonths,
    starterBufferMet: true,
    primaryHeroMetric: "net_worth",
    headline: "Stage 3: Build & Optimize",
    subline: "Amplify compound wealth, optimize pensions, and eliminate mortgage interest.",
  };
}
