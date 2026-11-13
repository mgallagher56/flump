import { scrubInstitutionNames } from "./anonymise.js";
import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  evaluateUkStudentLoan,
  filterConsumerDebts,
  normalizeDebtItem,
} from "./debt-payoff.js";
import {
  calculateFinancialHealthScore,
  calculateSafeToSpend,
  evaluateFinancialStage,
} from "./health-score.js";
import {
  type MonthlyPortfolioHistoryPoint,
  PortfolioSnapshot,
  type RawAccount,
  type RawAccountDetail,
  type ResolvedAccount,
} from "./portfolio.js";
import { calculateUKTax, type TaxCalculationResult, type TaxRecord } from "./tax-calculator.js";
import type {
  AvalancheVsSnowballComparison,
  FinancialBaseline,
  FinancialStageEvaluation,
  HealthScoreResult,
  NormalizedDebtItem,
  PromoCliffAlert,
  SafeToSpendResult,
  StudentLoanEvaluationResult,
  UkTaxCalculationResult,
} from "./types.js";
import { calculateUkTax as computeUkTax, getCurrentUKTaxYear } from "./uk-tax.js";

export interface AnonymizationOptions {
  /** If true, bank and provider names ("Monzo", "Barclays", etc.) are mapped to generic labels */
  anonymizeInstitutions?: boolean;
}

export interface BudgetEntryItem {
  id: string;
  category: string;
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "weekly" | string;
  isIncome: boolean;
  isEssential: boolean;
  notes?: string | null;
}

export interface BuildContextPackInput {
  baseline: FinancialBaseline;
  accounts?: RawAccount[];
  accountDetails?: RawAccountDetail[];
  budgetEntries?: BudgetEntryItem[];
  taxRecords?: TaxRecord[];
}

export interface FlumpAiContextPack {
  metadata: {
    generatedAt: string;
    schemaVersion: "1.0.0";
    isAnonymized: boolean;
    currency: string;
  };
  baseline: FinancialBaseline;
  stageEvaluation: FinancialStageEvaluation;
  healthScore: HealthScoreResult;
  portfolio: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    totalLiquidCash: number;
    totalInvestments: number;
    totalPensions: number;
    totalConsumerDebt: number;
    totalMortgageBalance: number;
    weightedSavingsRate: number;
    monthlyHistory: MonthlyPortfolioHistoryPoint[];
    accounts: ResolvedAccount[];
  };
  debtSummary: {
    consumerDebts: NormalizedDebtItem[];
    totalStartingDebtGbp: number;
    avalancheVsSnowballComparison: AvalancheVsSnowballComparison;
    promoCliffAlerts: PromoCliffAlert[];
    studentLoanEvaluation?: StudentLoanEvaluationResult;
  };
  budgetSummary: {
    monthlyIncome: number;
    essentialBillsMonthly: number;
    discretionarySpendMonthly: number;
    monthlySurplus: number;
    safeToSpend: SafeToSpendResult;
    emergencyRunwayMonths: number;
    entries: BudgetEntryItem[];
  };
  taxSummary: {
    currentTaxYear: string;
    ukTaxCalculation: UkTaxCalculationResult;
    selfAssessmentLedgerSummary?: TaxCalculationResult;
  };
}

/**
 * Builds a deterministic, PII-scrubbed FlumpAiContextPack for MCP and offline AI export.
 */
export function buildFlumpAiContextPack(
  input: BuildContextPackInput,
  options: AnonymizationOptions = {},
): FlumpAiContextPack {
  const isAnonymized = options.anonymizeInstitutions ?? true;
  const currency = "GBP";

  // 1. Scrub baseline of any direct PII identifier
  const safeBaseline: FinancialBaseline = {
    ...input.baseline,
    userId: isAnonymized ? "anonymous-user" : input.baseline.userId,
  };

  // 2. Anonymize Institution / Account names if requested
  const rawAccounts = input.accounts ?? [];
  const rawDetails = input.accountDetails ?? [];

  const categoryCounters: Record<string, number> = {};
  const accountNameMap = new Map<string, string>();

  const sanitizedRawAccounts: RawAccount[] = rawAccounts.map((acc, idx) => {
    const rawType = (acc.type || "other").toString();
    const typeKey = rawType.replace(/\s+/g, " ");

    if (isAnonymized) {
      categoryCounters[typeKey] = (categoryCounters[typeKey] ?? 0) + 1;
      const genericName = `${typeKey} Account #${categoryCounters[typeKey]}`;
      accountNameMap.set(acc.id || `acc_${idx}`, genericName);
      return {
        ...acc,
        name: genericName,
      };
    }
    return { ...acc };
  });

  // 3. Resolve Portfolio Snapshot
  const snapshot = new PortfolioSnapshot(sanitizedRawAccounts, rawDetails);
  const resolvedAccounts = snapshot.getResolvedAccounts();

  // 4. Resolve Debt Items and Debt Schedules
  const debtItems = snapshot.toDebtItems();
  const { consumerDebts } = filterConsumerDebts(debtItems);
  const comparison = compareAvalancheAndSnowball(debtItems, 50);
  const totalDebtBalance = consumerDebts.reduce((sum, d) => sum + d.balanceGbp, 0);

  // Analyze promo cliffs if any
  const fullSchedule = calculateDebtSchedule(consumerDebts, 50, "AVALANCHE");
  const promoCliffAlerts = fullSchedule.promoCliffAlerts;

  // Student loan evaluation if user has one
  let studentLoanEvaluation: StudentLoanEvaluationResult | undefined;
  if (safeBaseline.studentLoanPlan && safeBaseline.studentLoanPlan !== "NONE") {
    studentLoanEvaluation = evaluateUkStudentLoan(
      safeBaseline.studentLoanPlan,
      safeBaseline.annualGrossSalary,
      15000, // standard baseline balance proxy
    );
  }

  // 5. Budget & Runway Evaluation
  const budgetEntries = (input.budgetEntries ?? []).map((entry, idx) => {
    let name = entry.name;
    if (isAnonymized && !entry.isIncome) {
      // Keep category clean, scrub sensitive names if any
      name = scrubInstitutionNames(entry.name);
    }
    // Free-text notes can hold anything, so they are dropped when anonymised.
    const { notes, ...rest } = entry;
    return {
      ...rest,
      ...(isAnonymized ? {} : { notes }),
      id: entry.id || `b_${idx}`,
      name,
    };
  });

  const monthlyIncomeFromBudget = budgetEntries
    .filter((e) => e.isIncome)
    .reduce((sum, e) => {
      if (e.frequency === "weekly") return sum + (e.amount * 52) / 12;
      if (e.frequency === "annual") return sum + e.amount / 12;
      return sum + e.amount;
    }, 0);

  const monthlyEssentialBills = budgetEntries
    .filter((e) => !e.isIncome && e.isEssential)
    .reduce((sum, e) => {
      if (e.frequency === "weekly") return sum + (e.amount * 52) / 12;
      if (e.frequency === "annual") return sum + e.amount / 12;
      return sum + e.amount;
    }, 0);

  const monthlyDiscretionary = budgetEntries
    .filter((e) => !e.isIncome && !e.isEssential)
    .reduce((sum, e) => {
      if (e.frequency === "weekly") return sum + (e.amount * 52) / 12;
      if (e.frequency === "annual") return sum + e.amount / 12;
      return sum + e.amount;
    }, 0);

  const effectiveMonthlyIncome =
    monthlyIncomeFromBudget > 0
      ? monthlyIncomeFromBudget
      : (safeBaseline.monthlyTakeHomeOverride ?? (safeBaseline.annualGrossSalary / 12) * 0.72);

  const effectiveEssentialBills =
    monthlyEssentialBills > 0
      ? monthlyEssentialBills
      : (safeBaseline.monthlyHousingCost ?? 900) + (safeBaseline.monthlyOtherOutgoings ?? 1100);

  const minDebtMonthly = consumerDebts.reduce((sum, d) => sum + d.minimumPaymentGbp, 0);
  const safeToSpend = calculateSafeToSpend(
    effectiveMonthlyIncome,
    effectiveEssentialBills,
    minDebtMonthly,
    0,
  );

  const totalLiquid = snapshot.getTotalLiquidCash();
  const emergencyRunwayMonths =
    effectiveEssentialBills > 0 ? Math.round((totalLiquid / effectiveEssentialBills) * 10) / 10 : 0;
  const monthlySurplus = Math.round(
    effectiveMonthlyIncome - effectiveEssentialBills - monthlyDiscretionary - minDebtMonthly,
  );

  // 6. Stage Evaluation & Health Score
  const stageEvaluation = evaluateFinancialStage({
    debts: consumerDebts,
    monthlySurplus,
    liquidSavings: totalLiquid,
    monthlyEssentialExpenses: effectiveEssentialBills,
  });

  const healthScore = calculateFinancialHealthScore({
    stage: stageEvaluation.canonicalStage,
    totalUnsecuredDebtGbp: totalDebtBalance,
    monthlyNetIncomeGbp: effectiveMonthlyIncome,
    monthlyEssentialBillsGbp: effectiveEssentialBills,
    emergencyFundGbp: totalLiquid,
    adjustedNetIncomeGbp: safeBaseline.annualGrossSalary,
  });

  // 7. UK Tax Calculation & Self-Assessment Ledger
  const ukTaxCalculation = computeUkTax({
    grossSalary: safeBaseline.annualGrossSalary,
    pensionContributionPct: safeBaseline.pensionContributionPct,
    isSalarySacrifice: safeBaseline.isSalarySacrifice,
    studentLoanPlan: safeBaseline.studentLoanPlan,
    region: safeBaseline.ukRegion,
    taxYear: safeBaseline.taxYear,
  });

  let selfAssessmentLedgerSummary: TaxCalculationResult | undefined;
  if (input.taxRecords && input.taxRecords.length > 0) {
    selfAssessmentLedgerSummary = calculateUKTax(
      safeBaseline.taxYear || getCurrentUKTaxYear(),
      input.taxRecords,
      safeBaseline.annualGrossSalary,
      safeBaseline.propertyOwnershipSharePct ?? 100,
    );
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      schemaVersion: "1.0.0",
      isAnonymized,
      currency,
    },
    baseline: safeBaseline,
    stageEvaluation,
    healthScore,
    portfolio: {
      netWorth: snapshot.getTotalNetWorth(),
      totalAssets: snapshot.getTotalAssets(),
      totalLiabilities: snapshot.getTotalLiabilities(),
      totalLiquidCash: snapshot.getTotalLiquidCash(),
      totalInvestments: snapshot.getTotalInvestments(),
      totalPensions: snapshot.getTotalPensions(),
      totalConsumerDebt: snapshot.getTotalConsumerDebt(),
      totalMortgageBalance: snapshot.getTotalMortgageBalance(),
      weightedSavingsRate: snapshot.getWeightedSavingsRate(),
      monthlyHistory: snapshot.getMonthlyHistory(),
      accounts: resolvedAccounts,
    },
    debtSummary: {
      consumerDebts,
      totalStartingDebtGbp: Math.round(totalDebtBalance * 100) / 100,
      avalancheVsSnowballComparison: comparison,
      promoCliffAlerts,
      studentLoanEvaluation,
    },
    budgetSummary: {
      monthlyIncome: Math.round(effectiveMonthlyIncome),
      essentialBillsMonthly: Math.round(effectiveEssentialBills),
      discretionarySpendMonthly: Math.round(monthlyDiscretionary),
      monthlySurplus,
      safeToSpend,
      emergencyRunwayMonths,
      entries: budgetEntries,
    },
    taxSummary: {
      currentTaxYear: safeBaseline.taxYear || getCurrentUKTaxYear(),
      ukTaxCalculation,
      selfAssessmentLedgerSummary,
    },
  };
}

/**
 * Formats a FlumpAiContextPack into human-readable Markdown suitable for clipboard export.
 */
export function formatAiContextPackMarkdown(pack: FlumpAiContextPack): string {
  const p = pack.portfolio;
  const b = pack.baseline;
  const d = pack.debtSummary;
  const bg = pack.budgetSummary;
  const tx = pack.taxSummary.ukTaxCalculation;

  return `# FLUMP UK FINANCIAL CONTEXT PACK
Generated: ${pack.metadata.generatedAt} | Anonymized: ${pack.metadata.isAnonymized ? "YES" : "NO"} | Currency: ${pack.metadata.currency}

## 1. Executive Summary & Health Grade
- **Current Financial Stage:** ${pack.stageEvaluation.headline} (${pack.stageEvaluation.canonicalStage})
- **Overall Health Score:** ${pack.healthScore.overallScore}/100 [Grade: ${pack.healthScore.grade}]
- **Primary Hero Focus:** ${pack.stageEvaluation.primaryHeroMetric}
- **Observations:**
${pack.healthScore.observations.map((o) => `  * ${o}`).join("\n") || "  * None."}

## 2. Net Worth & Assets
- **Total Net Worth:** £${p.netWorth.toLocaleString("en-GB")}
- **Total Assets:** £${p.totalAssets.toLocaleString("en-GB")} (Liquid: £${p.totalLiquidCash.toLocaleString("en-GB")}, Investments: £${p.totalInvestments.toLocaleString("en-GB")}, Pensions: £${p.totalPensions.toLocaleString("en-GB")})
- **Total Liabilities:** £${p.totalLiabilities.toLocaleString("en-GB")} (Consumer Debt: £${p.totalConsumerDebt.toLocaleString("en-GB")}, Mortgages: £${p.totalMortgageBalance.toLocaleString("en-GB")})
- **Weighted Cash Yield:** ${p.weightedSavingsRate}% AER

### Accounts:
${p.accounts
  .map(
    (a) =>
      `- ${a.name} (${a.category.toUpperCase()}): £${a.nominalBalance.toLocaleString("en-GB")}${
        a.interestRate ? ` @ ${a.interestRate}%` : ""
      }`,
  )
  .join("\n")}

## 3. Debt Architecture & Payoff
- **Consumer Debt Balance:** £${d.totalStartingDebtGbp.toLocaleString("en-GB")}
- **Avalanche Freedom Date:** ${d.avalancheVsSnowballComparison.avalanche.debtFreeDate} (Interest: £${d.avalancheVsSnowballComparison.avalanche.totalInterest.toLocaleString("en-GB")})
- **Snowball Momentum First Win:** ${d.avalancheVsSnowballComparison.snowballFirstWinDescription}
- **Interest Saved (Avalanche vs Min):** £${d.avalancheVsSnowballComparison.interestSavedAvalancheVsMin.toLocaleString("en-GB")}
${
  d.promoCliffAlerts.length > 0
    ? `\n### 0% Promotional Cliffs:\n${d.promoCliffAlerts
        .map(
          (c) =>
            `- ${c.debtName}: Expires ${c.promoExpiryDate}, Revert APR ${c.revertApr}%. Required: £${c.requiredMonthlyToClearBeforeCliff}/mo`,
        )
        .join("\n")}`
    : ""
}
${
  d.studentLoanEvaluation
    ? `\n### UK Student Loan Status:\n- Plan: ${d.studentLoanEvaluation.plan.toUpperCase()} | Projected outcome: ${d.studentLoanEvaluation.projectedOutcome}\n- Detail: ${d.studentLoanEvaluation.reasoning}`
    : ""
}

## 4. Cash Flow & Budget Runway
- **Estimated Net Take-Home:** £${bg.monthlyIncome.toLocaleString("en-GB")}/mo
- **Priority Essential Bills:** £${bg.essentialBillsMonthly.toLocaleString("en-GB")}/mo
- **Emergency Runway:** ${bg.emergencyRunwayMonths.toFixed(1)} Months
- **Weekly Safe-to-Spend:** £${bg.safeToSpend.weeklyAllowance.toLocaleString("en-GB")}/wk (£${bg.safeToSpend.dailyAllowance.toLocaleString("en-GB")}/day)
- **Monthly Net Surplus:** £${bg.monthlySurplus.toLocaleString("en-GB")}/mo

## 5. UK Tax & Fiscal Guardrails (${pack.taxSummary.currentTaxYear})
- **Gross Salary:** £${b.annualGrossSalary.toLocaleString("en-GB")}
- **Tax Region:** ${b.ukRegion}
- **Adjusted Net Income:** £${tx.adjustedNetIncomeGbp.toLocaleString("en-GB")}
- **In £100k Tax Trap:** ${tx.taxTrap.isInTaxTrap ? "YES (60%+ Marginal Rate)" : "NO"}
${
  tx.taxTrap.isInTaxTrap
    ? `- **Sacrifice to Escape Trap:** £${tx.taxTrap.contributionRequiredToEscapeGbp.toLocaleString("en-GB")}\n- **Estimated Tax Saved:** £${tx.taxTrap.estimatedTaxSavedByEscapingGbp.toLocaleString("en-GB")}`
    : ""
}
- **Remaining ISA Allowance:** £${tx.allowances.isaAllowanceRemainingGbp.toLocaleString("en-GB")} / £20,000
- **Remaining Pension Allowance:** £${tx.allowances.pensionAllowanceRemainingGbp.toLocaleString("en-GB")} / £${tx.allowances.pensionAnnualAllowanceGbp.toLocaleString("en-GB")}
- **Personal Savings Allowance:** £${tx.allowances.personalSavingsAllowanceGbp.toLocaleString("en-GB")} (${tx.allowances.marginalIncomeTaxBand} band)
`;
}
