import { anonymiseDescription, genericAccountLabel } from "./anonymise.js";
import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  evaluateUkStudentLoan,
  filterConsumerDebts,
  normalizeDebtItem,
} from "./debt-payoff.js";
import { calculateFinancialHealthScore, evaluateFinancialStage } from "./health-score.js";
import { buildFinancialPicture } from "./picture/build.js";
import { isFigureKnown } from "./picture/figure.js";
import { type ProfileFacts, profileFactsFromProfile } from "./picture/input.js";
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
  /**
   * The saved profile facts (no defaults). The budget summary's safe to spend needs them for
   * take-home; without them it is null rather than a guess from the defaulted baseline.
   */
  profileFacts?: ProfileFacts;
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
  /**
   * From the financial picture (E23): the same figures the web pages show. null means not
   * known (no budget rows, no essentials, or no take-home), never a guessed amount.
   */
  budgetSummary: {
    /** Budgeted income rows, monthly. */
    monthlyIncome: number | null;
    essentialBillsMonthly: number | null;
    discretionarySpendMonthly: number | null;
    plannedSavingsMonthly: number | null;
    monthlySurplus: number | null;
    safeToSpend: SafeToSpendResult | null;
    /** Months of cover: liquid cash over essential commitments. */
    emergencyRunwayMonths: number | null;
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
    const typeKey = genericAccountLabel(acc.type, 0).replace(/ Account #0$/, "");

    if (isAnonymized) {
      categoryCounters[typeKey] = (categoryCounters[typeKey] ?? 0) + 1;
      const genericName = genericAccountLabel(acc.type, categoryCounters[typeKey]);
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
  let incomeOrdinal = 0;
  const budgetEntries = (input.budgetEntries ?? []).map((entry, idx) => {
    let name = entry.name;
    if (isAnonymized) {
      // Income names can carry an employer; use a generic label. Other names are scrubbed.
      name = entry.isIncome ? `Income #${++incomeOrdinal}` : anonymiseDescription(entry.name);
    }
    // Free-text notes can hold anything, so they are dropped when anonymised.
    const { notes, ...rest } = entry;
    return {
      ...rest,
      ...(isAnonymized || notes === undefined ? {} : { notes }),
      id: entry.id || `b_${idx}`,
      name,
    };
  });

  // The budget summary comes from the one financial picture, so MCP and web agree (E23).
  const picture = buildFinancialPicture(
    {
      profile: input.profileFacts ?? profileFactsFromProfile(null),
      accounts: sanitizedRawAccounts,
      details: rawDetails,
      budget: budgetEntries,
    },
    { snapshot },
  );
  const pictureBudget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  const pictureSafeToSpend = isFigureKnown(picture.safeToSpend) ? picture.safeToSpend.value : null;
  const pictureCover = isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value : null;

  // Stage and health score only (E17 owns them): they still fall back to the baseline when the
  // budget is empty. Every budget figure the pack reports comes from the picture above.
  const effectiveMonthlyIncome =
    pictureBudget && pictureBudget.income > 0
      ? pictureBudget.income
      : (safeBaseline.monthlyTakeHomeOverride ?? (safeBaseline.annualGrossSalary / 12) * 0.72);
  const effectiveEssentialBills =
    pictureBudget && pictureBudget.essentials > 0
      ? pictureBudget.essentials
      : (safeBaseline.monthlyHousingCost ?? 900) + (safeBaseline.monthlyOtherOutgoings ?? 1100);
  const minDebtMonthly = consumerDebts.reduce((sum, d) => sum + d.minimumPaymentGbp, 0);
  const totalLiquid = snapshot.getTotalLiquidCash();
  // Budget essentials already include "debt" rows; only minimums beyond them come off again.
  const debtBeyondBudget = Math.max(0, minDebtMonthly - (pictureBudget?.debtPayments ?? 0));
  const monthlySurplus = Math.round(
    effectiveMonthlyIncome -
      effectiveEssentialBills -
      (pictureBudget?.discretionary ?? 0) -
      debtBeyondBudget,
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
      monthlyIncome: pictureBudget?.hasIncome ? pictureBudget.income : null,
      essentialBillsMonthly: pictureBudget?.essentials ?? null,
      discretionarySpendMonthly: pictureBudget?.discretionary ?? null,
      plannedSavingsMonthly: pictureBudget?.savings ?? null,
      monthlySurplus: pictureBudget?.hasIncome ? pictureBudget.surplus : null,
      safeToSpend: pictureSafeToSpend
        ? {
            weeklyAllowance: pictureSafeToSpend.weekly,
            dailyAllowance: pictureSafeToSpend.daily,
            monthlyDiscretionary: pictureSafeToSpend.monthly,
            fixedCommitments: pictureSafeToSpend.commitments.total,
          }
        : null,
      emergencyRunwayMonths: pictureCover?.months ?? null,
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
function gbpOrNotSet(value: number | null): string {
  return value === null ? "Not set" : formatSignedGbp(value);
}

/** en-GB currency with the sign before the symbol: -£120, never £-120. */
function formatSignedGbp(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-GB");
  return value < 0 ? `-£${abs}` : `£${abs}`;
}

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
- **Total Net Worth:** ${formatSignedGbp(p.netWorth)}
- **Total Assets:** £${p.totalAssets.toLocaleString("en-GB")} (Liquid: £${p.totalLiquidCash.toLocaleString("en-GB")}, Investments: £${p.totalInvestments.toLocaleString("en-GB")}, Pensions: £${p.totalPensions.toLocaleString("en-GB")})
- **Total Liabilities:** £${p.totalLiabilities.toLocaleString("en-GB")} (Consumer Debt: £${p.totalConsumerDebt.toLocaleString("en-GB")}, Mortgages: £${p.totalMortgageBalance.toLocaleString("en-GB")})
- **Weighted Cash Yield:** ${p.weightedSavingsRate}% AER

### Accounts:
${p.accounts
  .map(
    (a) =>
      `- ${a.name} (${a.category.toUpperCase()}): ${formatSignedGbp(a.nominalBalance)}${
        a.nominalBalance < 0 && a.category === "cash" ? " (overdrawn)" : ""
      }${a.interestRate ? ` @ ${a.interestRate}%` : ""}`,
  )
  .join("\n")}

## 3. Debt Architecture & Payoff
- **Consumer Debt Balance:** £${d.totalStartingDebtGbp.toLocaleString("en-GB")}
- **Avalanche debt-free date:** ${d.avalancheVsSnowballComparison.avalanche.debtFreeDate} (Interest: £${d.avalancheVsSnowballComparison.avalanche.totalInterest.toLocaleString("en-GB")})
- **Snowball first debt cleared:** ${d.avalancheVsSnowballComparison.snowballFirstWinDescription}
- **Interest difference (avalanche vs minimum payments only):** £${d.avalancheVsSnowballComparison.interestSavedAvalancheVsMin.toLocaleString("en-GB")}
${
  d.promoCliffAlerts.length > 0
    ? `\n### 0% promotional periods ending:\n${d.promoCliffAlerts
        .map(
          (c) =>
            `- ${c.debtName}: Expires ${c.promoExpiryDate}, Revert APR ${c.revertApr}%. Monthly amount that clears it before expiry: £${c.requiredMonthlyToClearBeforeCliff}`,
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
- **Budgeted Income:** ${gbpOrNotSet(bg.monthlyIncome)}/mo
- **Priority Essential Bills:** ${gbpOrNotSet(bg.essentialBillsMonthly)}/mo
- **Months of Cover:** ${bg.emergencyRunwayMonths === null ? "Not set" : `${bg.emergencyRunwayMonths.toFixed(1)} Months`}
- **Weekly Safe-to-Spend:** ${bg.safeToSpend ? `${formatSignedGbp(bg.safeToSpend.weeklyAllowance)}/wk (${formatSignedGbp(bg.safeToSpend.dailyAllowance)}/day)` : "Not set"}
- **Monthly Net Surplus:** ${gbpOrNotSet(bg.monthlySurplus)}/mo

## 5. UK Tax & Fiscal Guardrails (${pack.taxSummary.currentTaxYear})
- **Gross Salary:** £${b.annualGrossSalary.toLocaleString("en-GB")}
- **Tax Region:** ${b.ukRegion}
- **Adjusted Net Income:** £${tx.adjustedNetIncomeGbp.toLocaleString("en-GB")}
- **Adjusted net income in the £100,000 to £125,140 band:** ${tx.taxTrap.isInTaxTrap ? "YES (60%+ marginal rate)" : "NO"}
${
  tx.taxTrap.isInTaxTrap
    ? `- **Contribution that brings adjusted net income to £100,000:** £${tx.taxTrap.contributionRequiredToEscapeGbp.toLocaleString("en-GB")}\n- **Estimated tax difference at that contribution:** £${tx.taxTrap.estimatedTaxSavedByEscapingGbp.toLocaleString("en-GB")}`
    : ""
}
- **Remaining ISA Allowance:** £${tx.allowances.isaAllowanceRemainingGbp.toLocaleString("en-GB")} / £20,000
- **Remaining Pension Allowance:** £${tx.allowances.pensionAllowanceRemainingGbp.toLocaleString("en-GB")} / £${tx.allowances.pensionAnnualAllowanceGbp.toLocaleString("en-GB")}
- **Personal Savings Allowance:** £${tx.allowances.personalSavingsAllowanceGbp.toLocaleString("en-GB")} (${tx.allowances.marginalIncomeTaxBand} band)
`;
}
